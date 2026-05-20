import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";
import { isBlockedBetween } from "@/lib/blocks";
import { REPORT_REASONS, isValidReportReason } from "@/lib/reports";

type ReportBody = {
  targetKind?: "listing" | "user" | "message" | "conversation";
  targetId?: string;
  reason?: string;
  description?: string;
};

export async function POST(request: Request) {
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in to file a report." }, { status: 401 });
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("file reports");
  }

  const { targetKind, targetId, reason, description } = (await request.json()) as ReportBody;

  if (!targetKind || !targetId || !reason) {
    return NextResponse.json({ error: "Target and reason are required." }, { status: 400 });
  }

  if (!isValidReportReason(reason)) {
    return NextResponse.json({ error: "Invalid reason category." }, { status: 400 });
  }

  if (reason === "other" && !description?.trim()) {
    return NextResponse.json({ error: "Please add a description when selecting Other." }, { status: 400 });
  }

  // Map target kind → the column the report will reference, and validate the
  // target exists. Self-reports are blocked for listings and users.
  const targetColumn: Record<NonNullable<ReportBody["targetKind"]>, string> = {
    listing: "reported_listing_id",
    user: "reported_user_id",
    message: "reported_message_id",
    conversation: "reported_conversation_id",
  };

  if (targetKind === "listing") {
    const { data } = await supabase.from("listings").select("seller_id").eq("id", targetId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (data.seller_id === userId) {
      return NextResponse.json({ error: "You can't report your own listing." }, { status: 400 });
    }
    if (await isBlockedBetween(userId, data.seller_id)) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
  } else if (targetKind === "user") {
    if (targetId === userId) {
      return NextResponse.json({ error: "You can't report yourself." }, { status: 400 });
    }
    const { data } = await supabase.from("profiles").select("id").eq("id", targetId).maybeSingle();
    if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (await isBlockedBetween(userId, targetId)) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
  } else if (targetKind === "message") {
    const { data } = await supabase.from("messages").select("sender_id").eq("id", targetId).maybeSingle();
    if (!data) return NextResponse.json({ error: "Message not found." }, { status: 404 });
    if (data.sender_id === userId) {
      return NextResponse.json({ error: "You can't report your own message." }, { status: 400 });
    }
  } else if (targetKind === "conversation") {
    const { data } = await supabase
      .from("conversations")
      .select("id, buyer_id, seller_id")
      .eq("id", targetId)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    if (data.buyer_id !== userId && data.seller_id !== userId) {
      return NextResponse.json({ error: "You can only report conversations you're part of." }, { status: 403 });
    }
  }

  // Block duplicate pending reports from the same user against the same target.
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", userId)
    .eq(targetColumn[targetKind], targetId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending report for this. We'll review it soon." },
      { status: 409 },
    );
  }

  const reasonLabel = REPORT_REASONS.find((entry) => entry.value === reason)?.label ?? reason;

  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    report_type: targetKind,
    reason: reasonLabel,
    description: description?.trim() || null,
    [targetColumn[targetKind]]: targetId,
    status: "pending",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
