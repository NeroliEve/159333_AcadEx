import type { PaymentStatus } from "@/lib/payments";

export const BUY_REQUEST_DECLINE_LIMIT = 3;
export const MAX_BUY_REQUEST_MESSAGE_LENGTH = 500;

export type ExchangeTransactionStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "declined"
  | "mismatch";

export type TransactionRequestType = "buy" | "trade";

export type BuyRequestMessageValidation =
  | { ok: true; message: string }
  | { ok: false; error: string };

export function validateBuyRequestMessage(value: unknown): BuyRequestMessageValidation {
  const message = typeof value === "string" ? value.trim() : "";

  if (!message) {
    return { ok: false, error: "Add a short message for the seller." };
  }

  if (message.length > MAX_BUY_REQUEST_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Request messages must be ${MAX_BUY_REQUEST_MESSAGE_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, message };
}

export const validateTradeRequestMessage = validateBuyRequestMessage;

export function getBuyRequestAttemptState({
  declinedCount,
  hasPendingRequest,
}: {
  declinedCount: number;
  hasPendingRequest: boolean;
}) {
  const remainingAttempts = Math.max(0, BUY_REQUEST_DECLINE_LIMIT - declinedCount);

  if (hasPendingRequest) {
    return {
      canRequest: false,
      remainingAttempts,
      statusMessage: "Request sent",
    };
  }

  if (remainingAttempts <= 0) {
    return {
      canRequest: false,
      remainingAttempts: 0,
      statusMessage: "Buy request declined. You cannot request this listing again.",
    };
  }

  if (declinedCount > 0) {
    return {
      canRequest: true,
      remainingAttempts,
      statusMessage:
        `Buy request declined. You can request ${remainingAttempts} more ${remainingAttempts === 1 ? "time" : "times"}.`,
    };
  }

  return {
    canRequest: true,
    remainingAttempts,
    statusMessage: null,
  };
}

export function canSendConversationMessage({
  archivedAt,
  transaction,
}: {
  archivedAt: string | null;
  transaction: {
    requestType: TransactionRequestType;
    reservationConfirmedAt: string | null;
    status: ExchangeTransactionStatus;
  } | null;
}) {
  return (
    !archivedAt &&
    !!transaction &&
    (
      transaction.status === "pending" ||
      transaction.status === "completed" ||
      transaction.status === "cancelled"
    )
  );
}

export function getDeclinedRequestNotice({
  isBuyer,
  status,
}: {
  isBuyer: boolean;
  status: ExchangeTransactionStatus;
}) {
  if (!isBuyer || status !== "declined") return null;

  return "This request was declined. You can return to the listing to send another request if attempts remain.";
}

export function isUnacceptedBuyRequest(transaction: {
  offeredListingId: string | null;
  requestType: TransactionRequestType;
  reservationConfirmedAt: string | null;
  status: ExchangeTransactionStatus;
}) {
  return (
    transaction.status === "pending" &&
    !transaction.reservationConfirmedAt &&
    !transaction.offeredListingId &&
    transaction.requestType === "buy"
  );
}

export function canCancelAcceptedTransaction(transaction: {
  offeredListingId: string | null;
  paymentStatus: PaymentStatus;
  requestType: TransactionRequestType;
  reservationConfirmedAt: string | null;
  status: ExchangeTransactionStatus;
}) {
  if (transaction.status !== "pending") return false;
  if (!transaction.reservationConfirmedAt) return false;
  if (
    transaction.requestType === "buy" &&
    !transaction.offeredListingId &&
    transaction.paymentStatus === "paid"
  ) {
    return false;
  }

  return true;
}

export function canReviewTransactionStatus(
  status: ExchangeTransactionStatus,
  reservationConfirmedAt: string | null,
) {
  return status === "completed" || (status === "cancelled" && !!reservationConfirmedAt);
}
