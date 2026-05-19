import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { isMarketplaceSuspended } from "@/lib/admin";
import { canReviewTransactionStatus } from "@/lib/exchange-flow";
import {
  getMyTransactions,
  getReviewForTransaction,
  getViewerContext,
  type ReviewData,
} from "@/lib/marketplace";

export async function GET() {
  try {
    const { profile, user } = await getViewerContext();

    if (!user) {
      return NextResponse.json(apiError("You need to sign in."), { status: 401 });
    }

    const transactions = await getMyTransactions(user.id);
    const reviewableTxIds = [...transactions.buying, ...transactions.selling]
      .filter((tx) => canReviewTransactionStatus(tx.status, tx.reservation_confirmed_at))
      .map((tx) => tx.id);
    const reviewEntries = await Promise.all(
      reviewableTxIds.map(async (txId) => [
        txId,
        await getReviewForTransaction(txId, user.id),
      ] as [string, ReviewData | null]),
    );

    return NextResponse.json(
      apiSuccess({
        isSuspended: isMarketplaceSuspended(profile),
        reviewMap: Object.fromEntries(reviewEntries),
        transactions,
        viewerId: user.id,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      apiError(error instanceof Error ? error.message : "Could not load transactions."),
      { status: 500 },
    );
  }
}
