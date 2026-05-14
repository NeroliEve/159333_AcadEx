import Link from "next/link";
import { Suspense } from "react";

import { fulfillCheckoutSession } from "@/lib/payment-fulfillment";
import { getStripe } from "@/lib/stripe";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

async function CheckoutSuccessContent({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  let title = "Payment status unavailable";
  let message = "Stripe did not send a checkout session ID back to AcadEx.";

  if (sessionId) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const result = await fulfillCheckoutSession(session);

      if (result.status === "paid") {
        title = "Payment successful";
        message = "The seller's demo wallet has been credited for this order.";
      } else {
        title = "Payment not completed";
        message = result.reason;
      }
    } catch (error) {
      title = "Payment could not be verified";
      message = error instanceof Error ? error.message : "AcadEx could not verify this payment.";
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-xl border border-border/70 bg-card p-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Stripe Checkout
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          href="/profile/transactions"
        >
          View transactions
        </Link>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          href="/profile/wallet"
        >
          View wallet
        </Link>
      </div>
    </section>
  );
}

function CheckoutSuccessFallback() {
  return (
    <section className="mx-auto max-w-2xl space-y-4 rounded-xl border border-border/70 bg-card p-8">
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="h-9 w-64 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
    </section>
  );
}

export default function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  return (
    <Suspense fallback={<CheckoutSuccessFallback />}>
      <CheckoutSuccessContent searchParams={searchParams} />
    </Suspense>
  );
}
