import type Stripe from "stripe";

import { nzdToMinorUnits } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export type FulfillmentResult =
  | { status: "paid"; transactionId: string }
  | { reason: string; status: "ignored" | "failed" };

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
}

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfillmentResult> {
  if (session.mode !== "payment") {
    return { reason: "Checkout Session is not a payment session.", status: "ignored" };
  }

  if (session.payment_status !== "paid") {
    return { reason: "Checkout Session has not been paid.", status: "ignored" };
  }

  const transactionId = session.metadata?.transactionId;
  if (!transactionId) {
    return { reason: "Checkout Session is missing transaction metadata.", status: "failed" };
  }

  const supabase = createAdminClient();
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("id, agreed_price, seller_id, payment_status, stripe_checkout_session_id")
    .eq("id", transactionId)
    .maybeSingle();

  if (error || !transaction) {
    return { reason: error?.message ?? "Transaction not found.", status: "failed" };
  }

  if (transaction.payment_status === "paid") {
    return { status: "paid", transactionId: transaction.id };
  }

  if (
    transaction.stripe_checkout_session_id &&
    transaction.stripe_checkout_session_id !== session.id
  ) {
    return {
      reason: "Checkout Session does not match the transaction.",
      status: "failed",
    };
  }

  if (transaction.agreed_price == null) {
    return { reason: "Transaction does not have an agreed price.", status: "failed" };
  }

  const expectedAmount = nzdToMinorUnits(transaction.agreed_price);
  if (session.amount_total !== expectedAmount || session.currency !== "nzd") {
    return {
      reason: "Checkout Session amount or currency does not match the transaction.",
      status: "failed",
    };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      paid_at: now,
      payment_status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: getPaymentIntentId(session),
      updated_at: now,
    })
    .eq("id", transaction.id);

  if (updateError) {
    return { reason: updateError.message, status: "failed" };
  }

  const { error: walletError } = await supabase
    .from("wallet_transactions")
    .upsert(
      {
        amount: transaction.agreed_price,
        description: "Book sale paid through Stripe test checkout",
        seller_id: transaction.seller_id,
        source_key: `sale:${transaction.id}`,
        status: "completed",
        transaction_id: transaction.id,
        type: "sale",
      },
      {
        ignoreDuplicates: true,
        onConflict: "source_key",
      },
    );

  if (walletError) {
    return { reason: walletError.message, status: "failed" };
  }

  return { status: "paid", transactionId: transaction.id };
}
