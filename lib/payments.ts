export type PaymentStatus =
  | "not_required"
  | "unpaid"
  | "checkout_pending"
  | "paid"
  | "failed";

export type CheckoutTransaction = {
  agreed_price: number | null;
  buyer_id: string;
  offered_listing_id: string | null;
  payment_status: PaymentStatus;
  reservation_confirmed_at: string | null;
  status: string;
};

export type CheckoutEligibility =
  | { eligible: true }
  | { eligible: false; reason: string };

export function nzdToMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

export function getCheckoutEligibility(
  transaction: CheckoutTransaction,
  viewerId: string,
): CheckoutEligibility {
  if (transaction.buyer_id !== viewerId) {
    return {
      eligible: false,
      reason: "Only the buyer can pay for this transaction.",
    };
  }

  if (transaction.offered_listing_id) {
    return {
      eligible: false,
      reason: "Trade transactions do not need Stripe payment.",
    };
  }

  if (transaction.status !== "pending") {
    return {
      eligible: false,
      reason: "Only active transactions can be paid.",
    };
  }

  if (!transaction.reservation_confirmed_at) {
    return {
      eligible: false,
      reason: "The seller must accept this request before payment.",
    };
  }

  if (transaction.payment_status === "paid") {
    return {
      eligible: false,
      reason: "This transaction has already been paid.",
    };
  }

  if (transaction.agreed_price == null || transaction.agreed_price <= 0) {
    return {
      eligible: false,
      reason: "This listing does not have a payable price.",
    };
  }

  return { eligible: true };
}

export function canCompleteTransaction(transaction: {
  offered_listing_id: string | null;
  payment_status: PaymentStatus;
}) {
  return !!transaction.offered_listing_id || transaction.payment_status === "paid";
}
