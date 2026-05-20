import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";
import { isBlockedBetween } from "@/lib/blocks";

type ReadRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: ReadRouteContext,
) {
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be logged in to update read status." },
      { status: 401 },
    );
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("read messages");
  }

  const { id } = await context.params;
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
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
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  const otherPartyId = conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
  if (await isBlockedBetween(userId, otherPartyId)) {
    return NextResponse.json(
      { error: "Conversation unavailable." },
      { status: 403 },
    );
  }

  const { data: updatedMessages, error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", id)
    .eq("is_read", false)
    .neq("sender_id", userId)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ updatedCount: updatedMessages?.length ?? 0 });
}
