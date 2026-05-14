import { NextResponse } from "next/server";

import { fulfillCheckoutSession } from "@/lib/payment-fulfillment";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 },
    );
  }

  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook." },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const result = await fulfillCheckoutSession(event.data.object);

    if (result.status === "failed") {
      return NextResponse.json({ error: result.reason }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
