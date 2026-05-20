import { NextResponse } from "next/server";

import { getMarketplaceSuspendedResponse, getViewerAccessContext } from "@/lib/admin";
import { isBlockedBetween } from "@/lib/blocks";
import { getCheckoutEligibility, nzdToMinorUnits } from "@/lib/payments";
import { getStripe } from "@/lib/stripe";

type CheckoutSessionRequest = {
  transactionId?: string;
};

export async function POST(request: Request) {
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in to pay." }, { status: 401 });
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("pay for transactions");
  }

  const { transactionId } = (await request.json()) as CheckoutSessionRequest;
  if (!transactionId) {
    return NextResponse.json({ error: "Transaction ID is required." }, { status: 400 });
  }

  const { data: transaction } = await supabase
    .from("transactions")
    .select(`
      id,
      agreed_price,
      buyer_id,
      offered_listing_id,
      payment_status,
      payment_requested_at,
      request_type,
      reservation_confirmed_at,
      seller_id,
      status,
      listing:listings!transactions_listing_id_fkey(id, title)
    `)
    .eq("id", transactionId)
    .maybeSingle();

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
  if (await isBlockedBetween(userId, transaction.buyer_id === userId ? transaction.seller_id : transaction.buyer_id)) {
    return NextResponse.json({ error: "This transaction is unavailable." }, { status: 403 });
  }

  const eligibility = getCheckoutEligibility(transaction, userId);
  if (!eligibility.eligible) {
    return NextResponse.json({ error: eligibility.reason }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const stripe = getStripe();
  const listing = transaction.listing as { id: string; title: string } | null;
  const amount = transaction.agreed_price ?? 0;

  const session = await stripe.checkout.sessions.create({
    cancel_url: `${origin}/profile/transactions`,
    client_reference_id: transaction.id,
    line_items: [
      {
        price_data: {
          currency: "nzd",
          product_data: {
            name: listing?.title ?? "AcadEx book purchase",
          },
          unit_amount: nzdToMinorUnits(amount),
        },
        quantity: 1,
      },
    ],
    metadata: {
      transactionId: transaction.id,
    },
    mode: "payment",
    payment_intent_data: {
      metadata: {
        transactionId: transaction.id,
      },
    },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  });

  const { error: updateError } = await supabase
    .from("transactions")
    .update({
      payment_status: "checkout_pending",
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", transaction.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
