import { NextResponse } from "next/server";

import { getMarketplaceSuspendedResponse, getViewerAccessContext } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateWalletBalance, validateWithdrawalAmount } from "@/lib/wallet";

type WithdrawalRequest = {
  amount?: number | string;
};

function normalizeAmount(value: number | string | undefined) {
  const amount = typeof value === "string" ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount)
    ? Math.round(amount * 100) / 100
    : Number.NaN;
}

export async function POST(request: Request) {
  const { profile, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("withdraw wallet funds");
  }

  const { amount: rawAmount } = (await request.json()) as WithdrawalRequest;
  const amount = normalizeAmount(rawAmount);
  const admin = createAdminClient();

  const { data: walletRows, error: walletError } = await admin
    .from("wallet_transactions")
    .select("amount, type")
    .eq("seller_id", userId);

  if (walletError) {
    return NextResponse.json({ error: walletError.message }, { status: 500 });
  }

  const balance = calculateWalletBalance(walletRows ?? []);
  const validation = validateWithdrawalAmount(amount, balance);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const { error: insertError } = await admin.from("wallet_transactions").insert({
    amount,
    description: "Fake demo withdrawal",
    seller_id: userId,
    source_key: `withdrawal:${crypto.randomUUID()}`,
    status: "completed",
    type: "withdrawal",
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
