import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { getViewerAccessContext } from "@/lib/admin";
import { getConversationDetail } from "@/lib/messages";
import { isBlockedBetween } from "@/lib/reports-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { profile, userId } = await getViewerAccessContext();

    if (!userId) {
      return NextResponse.json(apiError("You need to sign in."), { status: 401 });
    }

    if (profile?.account_status === "suspended") {
      return NextResponse.json(apiError("Messaging is disabled."), { status: 403 });
    }

    const { id } = await params;
    const { conversation, error } = await getConversationDetail(id, userId);

    if (error) {
      return NextResponse.json(apiError(error), { status: 500 });
    }

    if (!conversation) {
      return NextResponse.json(apiError("Conversation not found."), { status: 404 });
    }

    const otherPartyId =
      conversation.buyer_id === userId ? conversation.seller_id : conversation.buyer_id;
    if (await isBlockedBetween(userId, otherPartyId)) {
      return NextResponse.json(apiError("Conversation unavailable."), { status: 403 });
    }

    return NextResponse.json(apiSuccess({ conversation, viewerId: userId }));
  } catch (error) {
    return NextResponse.json(
      apiError(error instanceof Error ? error.message : "Could not load conversation."),
      { status: 500 },
    );
  }
}
