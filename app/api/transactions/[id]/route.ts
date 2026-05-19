import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";
import { canCancelAcceptedTransaction } from "@/lib/exchange-flow";
import { getCompletedListingArchiveUpdate, getListingStatusUpdate } from "@/lib/listing-archive";
import { canCompleteTransaction, canRequestSellerPayment } from "@/lib/payments";

const CONVERSATION_CLOSE_HOURS = 24;

function getConversationCloseTimestamp(now = new Date()) {
  const closeAfter = new Date(now);
  closeAfter.setHours(closeAfter.getHours() + CONVERSATION_CLOSE_HOURS);

  return {
    close_after: closeAfter.toISOString(),
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("update transactions");
  }

  const { action } = await request.json() as {
    action: "accept" | "decline" | "request_payment" | "complete" | "cancel";
  };

  if (!["accept", "decline", "request_payment", "complete", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, listing_id, offered_listing_id, conversation_id, buyer_id, seller_id, status, reservation_confirmed_at, payment_status")
    .eq("id", id)
    .maybeSingle();

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
  if (transaction.status !== "pending") {
    return NextResponse.json({ error: "This transaction is no longer active." }, { status: 400 });
  }

  const isBuyer = userId === transaction.buyer_id;
  const isSeller = userId === transaction.seller_id;

  if (!isBuyer && !isSeller) {
    return NextResponse.json({ error: "You are not part of this transaction." }, { status: 403 });
  }

  if ((action === "accept" || action === "complete") && !isSeller) {
    return NextResponse.json({ error: "Only the seller can perform this action." }, { status: 403 });
  }

  if (action === "request_payment") {
    const eligibility = canRequestSellerPayment(transaction, userId);
    if (!eligibility.eligible) {
      return NextResponse.json({ error: eligibility.reason }, { status: 403 });
    }
  }

  if (action === "decline" && !isSeller) {
    return NextResponse.json({ error: "Only the seller can decline requests." }, { status: 403 });
  }

  if ((action === "accept" || action === "decline") && transaction.reservation_confirmed_at) {
    return NextResponse.json({ error: "This request has already been accepted." }, { status: 400 });
  }

  if (action === "complete" && !canCompleteTransaction(transaction)) {
    return NextResponse.json(
      { error: "The buyer must complete Stripe payment before this sale can be marked completed." },
      { status: 400 },
    );
  }

  if (action === "complete" && !transaction.reservation_confirmed_at) {
    return NextResponse.json(
      { error: "The seller must accept this request before it can be completed." },
      { status: 400 },
    );
  }

  if (action === "cancel" && !canCancelAcceptedTransaction({
    offeredListingId: transaction.offered_listing_id,
    paymentStatus: transaction.payment_status,
    reservationConfirmedAt: transaction.reservation_confirmed_at,
    status: transaction.status,
  })) {
    return NextResponse.json(
      { error: "Only accepted unpaid sales or active trades can be cancelled." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const listingIds = [transaction.listing_id];
  if (transaction.offered_listing_id) listingIds.push(transaction.offered_listing_id);

  if (action === "accept") {
    const [{ error: txError }, { error: listingError }] = await Promise.all([
      supabase.from("transactions").update({
        payment_status: transaction.offered_listing_id ? "not_required" : "unpaid",
        payment_requested_at: null,
        payment_requested_by: null,
        status: "pending",
        reservation_confirmed_at: now,
        updated_at: now,
      }).eq("id", id),
      supabase.from("listings").update(getListingStatusUpdate("pending", now)).in("id", listingIds),
    ]);

    if (txError || listingError) {
      return NextResponse.json({ error: txError?.message ?? listingError?.message }, { status: 500 });
    }

    // Cancel all other pending requests competing for either listing
    await supabase
      .from("transactions")
      .update({ status: "cancelled", cancelled_at: now, updated_at: now })
      .in("listing_id", listingIds)
      .eq("status", "pending")
      .neq("id", id);

    if (transaction.offered_listing_id) {
      await supabase
        .from("transactions")
        .update({ status: "cancelled", cancelled_at: now, updated_at: now })
        .eq("offered_listing_id", transaction.offered_listing_id)
        .eq("status", "pending")
        .neq("id", id);
    }
  }

  if (action === "request_payment") {
    const { error: txError } = await supabase
      .from("transactions")
      .update({
        payment_requested_at: now,
        payment_requested_by: userId,
        updated_at: now,
      })
      .eq("id", id);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }
  }

  if (action === "decline") {
    const { error: txError } = await supabase
      .from("transactions")
      .update({
        status: "declined",
        declined_at: now,
        updated_at: now,
      })
      .eq("id", id);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }
  }

  if (action === "complete") {
    const closeConversation = getConversationCloseTimestamp(new Date(now));
    const [{ error: txError }, { error: listingError }] = await Promise.all([
      supabase.from("transactions").update({
        status: "completed",
        seller_confirmed_completed: true,
        completed_at: now,
        updated_at: now,
      }).eq("id", id),
      supabase.from("listings").update(getCompletedListingArchiveUpdate(now)).in("id", listingIds),
      transaction.conversation_id
        ? supabase.from("conversations").update(closeConversation).eq("id", transaction.conversation_id)
        : Promise.resolve({ error: null }),
    ]);

    if (txError || listingError) {
      return NextResponse.json({ error: txError?.message ?? listingError?.message }, { status: 500 });
    }
  }

  if (action === "cancel") {
    const closeConversation = getConversationCloseTimestamp(new Date(now));
    const { error: txError } = await supabase
      .from("transactions")
      .update({ status: "cancelled", cancelled_at: now, updated_at: now })
      .eq("id", id);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Only revert listings if the seller had already accepted (they were marked pending)
    if (transaction.reservation_confirmed_at) {
      await supabase
        .from("listings")
        .update(getListingStatusUpdate("available", now))
        .in("id", listingIds);
    }

    if (transaction.conversation_id) {
      await supabase
        .from("conversations")
        .update(closeConversation)
        .eq("id", transaction.conversation_id);
    }
  }

  return NextResponse.json({ success: true });
}
