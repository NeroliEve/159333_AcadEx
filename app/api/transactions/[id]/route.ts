import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";

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

  // Load the transaction to check permissions and current state
  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, listing_id, buyer_id, seller_id, status")
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

  const now = new Date().toISOString();

  if (action === "accept") {
    // Seller accepts this request — move listing to pending and cancel all
    // other pending requests for the same listing so no one else can claim it
    const [{ error: txError }, { error: listingError }] = await Promise.all([
      supabase.from("transactions").update({
        status: "pending",
        reservation_confirmed_at: now,
        updated_at: now,
      }).eq("id", id),
      supabase.from("listings").update({ status: "pending" }).eq("id", transaction.listing_id),
    ]);

    if (txError || listingError) {
      return NextResponse.json({ error: txError?.message ?? listingError?.message }, { status: 500 });
    }

    // Cancel all other pending requests for this listing
    await supabase
      .from("transactions")
      .update({ status: "cancelled", cancelled_at: now, updated_at: now })
      .eq("listing_id", transaction.listing_id)
      .eq("status", "pending")
      .neq("id", id);
  }

  if (action === "complete") {
    // Seller confirms the exchange happened — listing moves to sold
    const [{ error: txError }] = await Promise.all([
      supabase.from("transactions").update({
        status: "completed",
        seller_confirmed_completed: true,
        completed_at: now,
        updated_at: now,
      }).eq("id", id),
      supabase.from("listings").update({ status: "sold" }).eq("id", transaction.listing_id),
    ]);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }
  }

  if (action === "cancel") {
    // Either party cancels — if the listing was pending (seller had accepted),
    // revert it back to available so other buyers can request again
    const { error: txError } = await supabase
      .from("transactions")
      .update({ status: "cancelled", cancelled_at: now, updated_at: now })
      .eq("id", id);

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    // Only revert listing if this was the accepted transaction (reservation_confirmed_at set)
    if (transaction.status === "pending") {
      await supabase
        .from("listings")
        .update({ status: "available" })
        .eq("id", transaction.listing_id);
    }
  }

  return NextResponse.json({ success: true });
}
