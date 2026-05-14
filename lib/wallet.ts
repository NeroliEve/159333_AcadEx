import { createClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/database.types";

export type WalletTransactionKind = "sale" | "withdrawal";

export type WalletLedgerEntry = {
  amount: number;
  type: WalletTransactionKind;
};

export type WalletTransactionData = Pick<
  TableRow<"wallet_transactions">,
  | "amount"
  | "created_at"
  | "description"
  | "id"
  | "source_key"
  | "status"
  | "transaction_id"
  | "type"
>;

export type WithdrawalValidation =
  | { valid: true }
  | { reason: string; valid: false };

export function calculateWalletBalance(entries: WalletLedgerEntry[]) {
  return entries.reduce((balance, entry) => {
    if (entry.type === "withdrawal") {
      return balance - entry.amount;
    }

    return balance + entry.amount;
  }, 0);
}

export function validateWithdrawalAmount(
  amount: number,
  availableBalance: number,
): WithdrawalValidation {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      reason: "Enter an amount greater than $0.",
      valid: false,
    };
  }

  if (amount > availableBalance) {
    return {
      reason: "You cannot withdraw more than your available balance.",
      valid: false,
    };
  }

  return { valid: true };
}

export async function getWalletTransactions(
  sellerId: string,
): Promise<WalletTransactionData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("wallet_transactions")
    .select("id, amount, created_at, description, source_key, status, transaction_id, type")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });

  return (data ?? []) as WalletTransactionData[];
}

export async function getWalletBalance(sellerId: string) {
  const transactions = await getWalletTransactions(sellerId);
  return calculateWalletBalance(transactions);
}
