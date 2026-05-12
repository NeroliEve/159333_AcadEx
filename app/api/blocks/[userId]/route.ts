import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: targetId } = await params;
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }
  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("block users");
  }
  if (targetId === userId) {
    return NextResponse.json({ error: "You can't block yourself." }, { status: 400 });
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", targetId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("user_blocks")
    .upsert({ blocker_id: userId, blocked_id: targetId }, { onConflict: "blocker_id,blocked_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cancel any pending transactions between the two users. Covers both
  // directions: requests you sent to them and requests they sent to you.
  const now = new Date().toISOString();
  const { data: cancelled } = await supabase
    .from("transactions")
    .update({ status: "cancelled", cancelled_at: now, updated_at: now })
    .or(
      `and(buyer_id.eq.${userId},seller_id.eq.${targetId}),and(buyer_id.eq.${targetId},seller_id.eq.${userId})`,
    )
    .eq("status", "pending")
    .select("listing_id, offered_listing_id, reservation_confirmed_at");

  // If any of those cancelled transactions had locked listings (seller had
  // accepted, so listings were in 'pending'), revert them back to available.
  const listingsToRevert = new Set<string>();
  for (const tx of cancelled ?? []) {
    if (!tx.reservation_confirmed_at) continue;
    if (tx.listing_id) listingsToRevert.add(tx.listing_id);
    if (tx.offered_listing_id) listingsToRevert.add(tx.offered_listing_id);
  }
  if (listingsToRevert.size > 0) {
    await supabase
      .from("listings")
      .update({ status: "available" })
      .in("id", Array.from(listingsToRevert));
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId: targetId } = await params;
  const { supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", targetId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
