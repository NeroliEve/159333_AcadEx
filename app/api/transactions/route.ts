import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";
import {
  BUY_REQUEST_DECLINE_LIMIT,
  validateTradeRequestMessage,
  validateBuyRequestMessage,
} from "@/lib/exchange-flow";

export async function POST(request: Request) {
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in to request an exchange." }, { status: 401 });
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("request exchanges");
  }

  const { listingId, offeredListingId, requestMessage, requestType: rawRequestType } = (await request.json()) as {
    listingId?: string;
    offeredListingId?: string | null;
    requestMessage?: string | null;
    requestType?: "buy" | "trade";
  };

  if (!listingId) {
    return NextResponse.json({ error: "Listing ID is required." }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("archived_at, id, seller_id, price, status, listing_type, wanted_trade_text")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (listing.seller_id === userId) {
    return NextResponse.json({ error: "You can't request your own listing." }, { status: 400 });
  }
  if (listing.status !== "available" || listing.archived_at) {
    return NextResponse.json({ error: "This listing is no longer available." }, { status: 400 });
  }

  const requestType = rawRequestType ?? (offeredListingId ? "trade" : "buy");
  if (requestType !== "buy" && requestType !== "trade") {
    return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
  }

  const isTradeRequest = requestType === "trade";
  const messageValidation = isTradeRequest
    ? validateTradeRequestMessage(requestMessage)
    : validateBuyRequestMessage(requestMessage);

  if (!messageValidation.ok) {
    return NextResponse.json({ error: messageValidation.error }, { status: 400 });
  }

  if (isTradeRequest && listing.listing_type === "sale_only") {
    return NextResponse.json({ error: "This listing is not open to trades." }, { status: 400 });
  }
  if (!isTradeRequest && listing.listing_type === "trade_only") {
    return NextResponse.json({ error: "This listing is trade-only - send a trade request." }, { status: 400 });
  }

  if (isTradeRequest && offeredListingId) {
    const { data: offered } = await supabase
      .from("listings")
      .select("archived_at, id, seller_id, status, deleted_at")
      .eq("id", offeredListingId)
      .maybeSingle();

    if (!offered) {
      return NextResponse.json({ error: "Offered listing not found." }, { status: 404 });
    }
    if (offered.seller_id !== userId) {
      return NextResponse.json({ error: "You can only offer your own listings." }, { status: 403 });
    }
    if (offered.status !== "available" || offered.deleted_at || offered.archived_at) {
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

  if (!isTradeRequest) {
    const { count: declinedBuyCount } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("buyer_id", userId)
      .eq("status", "declined")
      .eq("request_type", "buy");

    if ((declinedBuyCount ?? 0) >= BUY_REQUEST_DECLINE_LIMIT) {
      return NextResponse.json(
        { error: "You can no longer request to buy this listing." },
        { status: 403 },
      );
    }
  }

  const { data: newConv, error: convError } = await supabase
    .from("conversations")
    .insert({
      listing_id: listingId,
      buyer_id: userId,
      seller_id: listing.seller_id,
    })
    .select("id")
    .single();

  if (!newConv) {
    return NextResponse.json(
      { error: convError?.message ?? "Could not create conversation." },
      { status: 500 },
    );
  }

  const conversationId = newConv.id;

  // Listing stays "available" — other buyers can still request it.
  // It only moves to "pending" when the seller accepts one of the requests.
  const { data: transaction, error: txError } = await supabase.from("transactions").insert({
    listing_id: listingId,
    buyer_id: userId,
    seller_id: listing.seller_id,
    conversation_id: conversationId,
    offered_listing_id: isTradeRequest ? offeredListingId ?? null : null,
    agreed_price: isTradeRequest ? null : listing.price,
    agreed_trade_text: isTradeRequest ? listing.wanted_trade_text : null,
    payment_status: isTradeRequest ? "not_required" : "unpaid",
    request_message: messageValidation.message,
    request_type: requestType,
    status: "pending",
    reservation_requested_at: new Date().toISOString(),
  }).select("id").single();

  if (txError || !transaction) {
    return NextResponse.json(
      { error: txError?.message ?? "Could not create transaction." },
      { status: 500 },
    );
  }

  const messageContent = messageValidation.message;

  if (messageContent) {
    await supabase.from("messages").insert({
      content: messageContent,
      conversation_id: conversationId,
      sender_id: userId,
    });

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);
  }

  return NextResponse.json({ conversationId, success: true });
}
