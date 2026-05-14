import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";
import { canCompleteTransaction } from "@/lib/payments";

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

  const { action } = await request.json() as { action: "accept" | "complete" | "cancel" };

  if (!["accept", "complete", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, listing_id, offered_listing_id, buyer_id, seller_id, status, reservation_confirmed_at, payment_status")
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

  if (action === "complete" && !canCompleteTransaction(transaction)) {
    return NextResponse.json(
      { error: "The buyer must complete Stripe payment before this sale can be marked completed." },
      { status: 400 },
    );
  }

  if (
    action === "cancel" &&
    !transaction.offered_listing_id &&
    transaction.payment_status === "paid"
  ) {
    return NextResponse.json(
      { error: "Paid demo transactions cannot be cancelled." },
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
        status: "pending",
        reservation_confirmed_at: now,
        updated_at: now,
      }).eq("id", id),
      supabase.from("listings").update({ status: "pending" }).in("id", listingIds),
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

  if (action === "complete") {
    const [{ error: txError }, { error: listingError }] = await Promise.all([
      supabase.from("transactions").update({
        status: "completed",
        seller_confirmed_completed: true,
        completed_at: now,
        updated_at: now,
      }).eq("id", id),
      supabase.from("listings").update({ status: "sold" }).in("id", listingIds),
    ]);

    if (txError || listingError) {
      return NextResponse.json({ error: txError?.message ?? listingError?.message }, { status: 500 });
    }
  }

  if (action === "cancel") {
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
        .update({ status: "available" })
        .in("id", listingIds);
    }
  }

  return NextResponse.json({ success: true });
}
