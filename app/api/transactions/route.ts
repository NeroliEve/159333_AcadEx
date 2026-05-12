import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";

export async function POST(request: Request) {
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in to request an exchange." }, { status: 401 });
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("request exchanges");
  }

  const { listingId, offeredListingId } = (await request.json()) as {
    listingId?: string;
    offeredListingId?: string | null;
  };

  if (!listingId) {
    return NextResponse.json({ error: "Listing ID is required." }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id, price, status, listing_type, wanted_trade_text")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (listing.seller_id === userId) {
    return NextResponse.json({ error: "You can't request your own listing." }, { status: 400 });
  }
  if (listing.status !== "available") {
    return NextResponse.json({ error: "This listing is no longer available." }, { status: 400 });
  }

  const isTradeRequest = !!offeredListingId;

  if (isTradeRequest && listing.listing_type === "sale_only") {
    return NextResponse.json({ error: "This listing is not open to trades." }, { status: 400 });
  }
  if (!isTradeRequest && listing.listing_type === "trade_only") {
    return NextResponse.json({ error: "This listing is trade-only — you must offer a book." }, { status: 400 });
  }

  if (isTradeRequest) {
    const { data: offered } = await supabase
      .from("listings")
      .select("id, seller_id, status, deleted_at")
      .eq("id", offeredListingId)
      .maybeSingle();

    if (!offered) {
      return NextResponse.json({ error: "Offered listing not found." }, { status: 404 });
    }
    if (offered.seller_id !== userId) {
      return NextResponse.json({ error: "You can only offer your own listings." }, { status: 403 });
    }
    if (offered.status !== "available" || offered.deleted_at) {
      return NextResponse.json({ error: "Your offered listing must be available." }, { status: 400 });
    }
  }

  // One pending request per buyer per listing (others may also have pending
  // requests against the same listing — the seller will accept one of them).
  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingTx) {
    return NextResponse.json(
      { error: "You already have a pending request for this listing." },
      { status: 409 },
    );
  }

  // Reuse or create the conversation. Race-safe: if SELECT misses and a
  // concurrent INSERT lands first, the second INSERT hits the unique
  // constraint and we fall back to fetching the existing one.
  let conversationId: string;

  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("buyer_id", userId)
    .eq("seller_id", listing.seller_id)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv, error: convError } = await supabase
      .from("conversations")
      .insert({
        listing_id: listingId,
        buyer_id: userId,
        seller_id: listing.seller_id,
      })
      .select("id")
      .single();

    if (newConv) {
      conversationId = newConv.id;
    } else {
      const { data: refetched } = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer_id", userId)
        .eq("seller_id", listing.seller_id)
        .maybeSingle();

      if (!refetched) {
        return NextResponse.json(
          { error: convError?.message ?? "Could not create conversation." },
          { status: 500 },
        );
      }
      conversationId = refetched.id;
    }
  }

  // Listing stays "available" — other buyers can still request it.
  // It only moves to "pending" when the seller accepts one of the requests.
  const { error: txError } = await supabase.from("transactions").insert({
    listing_id: listingId,
    buyer_id: userId,
    seller_id: listing.seller_id,
    conversation_id: conversationId,
    offered_listing_id: isTradeRequest ? offeredListingId : null,
    agreed_price: isTradeRequest ? null : listing.price,
    agreed_trade_text: isTradeRequest ? listing.wanted_trade_text : null,
    status: "pending",
    reservation_requested_at: new Date().toISOString(),
  });

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  return NextResponse.json({ conversationId, success: true });
}
