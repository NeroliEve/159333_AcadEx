import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to request a purchase." }, { status: 401 });
  }

  const { listingId } = await request.json();

  if (!listingId) {
    return NextResponse.json({ error: "Listing ID is required." }, { status: 400 });
  }

  // Load the listing to validate it's available and get the seller
  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id, price, status, listing_type, wanted_trade_text")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (listing.seller_id === user.id) {
    return NextResponse.json({ error: "You can't purchase your own listing." }, { status: 400 });
  }
  if (listing.status !== "available") {
    return NextResponse.json({ error: "This listing is no longer available." }, { status: 400 });
  }

  // Prevent duplicate pending transactions for the same listing and buyer
  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingTx) {
    return NextResponse.json({ error: "You already have a pending request for this listing." }, { status: 409 });
  }

  // Reuse an existing conversation between these two users about this listing,
  // or create a new one — the trigger requires a valid conversation_id
  let conversationId: string;

  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", user.id)
    .eq("seller_id", listing.seller_id)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        buyer_id: user.id,
        seller_id: listing.seller_id,
      })
      .select("id")
      .single();

    if (convError || !newConv) {
      return NextResponse.json({ error: convError?.message ?? "Could not create conversation." }, { status: 500 });
    }

    conversationId = newConv.id;
  }

  // Create the transaction — listing stays "available" so other buyers can still request it.
  // The listing only moves to "pending" when the seller accepts one of the requests.
  const { error: txError } = await supabase.from("transactions").insert({
    listing_id: listingId,
    buyer_id: user.id,
    seller_id: listing.seller_id,
    conversation_id: conversationId,
    agreed_price: listing.price,
    agreed_trade_text: listing.listing_type !== "sale_only" ? listing.wanted_trade_text : null,
    status: "pending",
    reservation_requested_at: new Date().toISOString(),
  });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
