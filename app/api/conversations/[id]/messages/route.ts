import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";
import { canSendConversationMessage } from "@/lib/exchange-flow";
import { MAX_MESSAGE_LENGTH, MESSAGE_SELECT } from "@/lib/messages";

type MessageRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: MessageRouteContext,
) {
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be logged in to send messages." },
      { status: 401 },
    );
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("send messages");
  }

  const { id } = await context.params;

  const requestBody = await request.json().catch(() => ({}));
  const content = typeof requestBody.content === "string"
    ? requestBody.content.trim()
    : "";

  if (!content) {
    return NextResponse.json(
      { error: "Message content is required." },
      { status: 400 },
    );
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id, archived_at")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  if (conversation.buyer_id !== userId && conversation.seller_id !== userId) {
    return NextResponse.json(
      { error: "You are not part of this conversation." },
      { status: 403 },
    );
  }

  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, status, request_type, reservation_confirmed_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!canSendConversationMessage({
    archivedAt: conversation.archived_at,
    transaction: transaction
      ? {
          requestType: transaction.request_type,
          reservationConfirmedAt: transaction.reservation_confirmed_at,
          status: transaction.status,
        }
      : null,
  })) {
    return NextResponse.json(
      { error: "Chat is not available for this conversation." },
      { status: 403 },
    );
  }

  // Block check: if either party has blocked the other, refuse new messages
  const otherPartyId = conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("blocker_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${otherPartyId}),and(blocker_id.eq.${otherPartyId},blocked_id.eq.${userId})`,
    )
    .limit(1);

  if ((blocks ?? []).length > 0) {
    return NextResponse.json(
      { error: "You can no longer message this user." },
      { status: 403 },
    );
  }

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      content,
      conversation_id: id,
      sender_id: userId,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !message) {
    return NextResponse.json(
      { error: error?.message ?? "Could not send your message." },
      { status: 500 },
    );
  }

  await supabase
    .from("conversations")
    .update({ last_message_at: message.created_at })
    .eq("id", id);

  return NextResponse.json({ message });
}
