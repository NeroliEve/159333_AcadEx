import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { isMarketplaceSuspended } from "@/lib/admin";
import { getMyConversationSummaries } from "@/lib/messages";
import { getViewerContext } from "@/lib/marketplace";

export async function GET() {
  try {
    const { profile, user } = await getViewerContext();

    if (!user) {
      return NextResponse.json(apiError("You need to sign in."), { status: 401 });
    }

    if (isMarketplaceSuspended(profile)) {
      return NextResponse.json(apiError("Messaging is disabled."), { status: 403 });
    }

    return NextResponse.json(
      apiSuccess({
        archivedSummaries: await getMyConversationSummaries(user.id, { archived: true }),
        summaries: await getMyConversationSummaries(user.id),
        viewerId: user.id,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      apiError(error instanceof Error ? error.message : "Could not load conversations."),
      { status: 500 },
    );
  }
}
