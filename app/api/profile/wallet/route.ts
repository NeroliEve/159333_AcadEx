import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { isMarketplaceSuspended } from "@/lib/admin";
import { getViewerContext } from "@/lib/marketplace";
import { calculateWalletBalance, getWalletTransactions } from "@/lib/wallet";

export async function GET() {
  try {
    const { profile, user } = await getViewerContext();

    if (!user) {
      return NextResponse.json(apiError("You need to sign in."), { status: 401 });
    }

    const transactions = await getWalletTransactions(user.id);
    return NextResponse.json(
      apiSuccess({
        balance: calculateWalletBalance(transactions),
        isSuspended: isMarketplaceSuspended(profile),
        transactions,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      apiError(error instanceof Error ? error.message : "Could not load wallet data."),
      { status: 500 },
    );
  }
}
