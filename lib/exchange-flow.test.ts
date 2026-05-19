import { describe, expect, it } from "vitest";

import {
  BUY_REQUEST_DECLINE_LIMIT,
  MAX_BUY_REQUEST_MESSAGE_LENGTH,
  canCancelAcceptedTransaction,
  canReviewTransactionStatus,
  canSendConversationMessage,
  getDeclinedRequestNotice,
  getBuyRequestAttemptState,
  isUnacceptedBuyRequest,
  validateTradeRequestMessage,
  validateBuyRequestMessage,
} from "@/lib/exchange-flow";

describe("validateBuyRequestMessage", () => {
  it("requires a non-empty buy request message", () => {
    expect(validateBuyRequestMessage("   ")).toEqual({
      ok: false,
      error: "Add a short message for the seller.",
    });
  });

  it("rejects buy request messages over 500 characters", () => {
    expect(validateBuyRequestMessage("a".repeat(MAX_BUY_REQUEST_MESSAGE_LENGTH + 1))).toEqual({
      ok: false,
      error: "Request messages must be 500 characters or fewer.",
    });
  });

  it("accepts and trims a valid buy request message", () => {
    expect(validateBuyRequestMessage("  Is this still available?  ")).toEqual({
      ok: true,
      message: "Is this still available?",
    });
  });
});

describe("validateTradeRequestMessage", () => {
  it("requires a non-empty trade request message", () => {
    expect(validateTradeRequestMessage("   ")).toEqual({
      ok: false,
      error: "Add a short message for the seller.",
    });
  });

  it("rejects trade request messages over 500 characters", () => {
    expect(validateTradeRequestMessage("a".repeat(MAX_BUY_REQUEST_MESSAGE_LENGTH + 1))).toEqual({
      ok: false,
      error: "Request messages must be 500 characters or fewer.",
    });
  });

  it("accepts and trims a valid trade request message", () => {
    expect(validateTradeRequestMessage("  Would you consider swapping?  ")).toEqual({
      ok: true,
      message: "Would you consider swapping?",
    });
  });
});

describe("getBuyRequestAttemptState", () => {
  it("allows a retry after one seller decline and reports remaining attempts", () => {
    expect(getBuyRequestAttemptState({ declinedCount: 1, hasPendingRequest: false })).toEqual({
      canRequest: true,
      remainingAttempts: 2,
      statusMessage: "Buy request declined. You can request 2 more times.",
    });
  });

  it("blocks buy requests after three seller declines", () => {
    expect(getBuyRequestAttemptState({
      declinedCount: BUY_REQUEST_DECLINE_LIMIT,
      hasPendingRequest: false,
    })).toMatchObject({
      canRequest: false,
      remainingAttempts: 0,
    });
  });

  it("blocks duplicate pending requests", () => {
    expect(getBuyRequestAttemptState({ declinedCount: 0, hasPendingRequest: true })).toMatchObject({
      canRequest: false,
      remainingAttempts: 3,
      statusMessage: "Request sent",
    });
  });
});

describe("canSendConversationMessage", () => {
  it("allows chat after seller acceptance on an active conversation", () => {
    expect(
      canSendConversationMessage({
        archivedAt: null,
        transaction: {
          reservationConfirmedAt: "2026-05-14T00:00:00.000Z",
          requestType: "buy",
          status: "pending",
        },
      }),
    ).toBe(true);
  });

  it("allows chat while a request is still pending seller acceptance", () => {
    expect(
      canSendConversationMessage({
        archivedAt: null,
        transaction: {
          reservationConfirmedAt: null,
          requestType: "trade",
          status: "pending",
        },
      }),
    ).toBe(true);
  });

  it("rejects chat for archived conversations", () => {
    expect(
      canSendConversationMessage({
        archivedAt: "2026-05-14T00:00:00.000Z",
        transaction: {
          reservationConfirmedAt: "2026-05-14T00:00:00.000Z",
          requestType: "buy",
          status: "pending",
        },
      }),
    ).toBe(false);
  });

  it("allows chat for completed transactions until the conversation is archived", () => {
    expect(
      canSendConversationMessage({
        archivedAt: null,
        transaction: {
          reservationConfirmedAt: "2026-05-14T00:00:00.000Z",
          requestType: "buy",
          status: "completed",
        },
      }),
    ).toBe(true);
  });
});

describe("getDeclinedRequestNotice", () => {
  it("shows the declined retry notice only to buyers", () => {
    expect(getDeclinedRequestNotice({ isBuyer: true, status: "declined" })).toBe(
      "This request was declined. You can return to the listing to send another request if attempts remain.",
    );
    expect(getDeclinedRequestNotice({ isBuyer: false, status: "declined" })).toBeNull();
  });

  it("hides the declined retry notice for active transactions", () => {
    expect(getDeclinedRequestNotice({ isBuyer: true, status: "pending" })).toBeNull();
  });
});

describe("isUnacceptedBuyRequest", () => {
  it("returns true only for pending sale requests awaiting seller acceptance", () => {
    expect(
      isUnacceptedBuyRequest({
        offeredListingId: null,
        requestType: "buy",
        reservationConfirmedAt: null,
        status: "pending",
      }),
    ).toBe(true);

    expect(
      isUnacceptedBuyRequest({
        offeredListingId: null,
        requestType: "buy",
        reservationConfirmedAt: "2026-05-14T00:00:00.000Z",
        status: "pending",
      }),
    ).toBe(false);

    expect(
      isUnacceptedBuyRequest({
        offeredListingId: "trade-listing",
        requestType: "trade",
        reservationConfirmedAt: null,
        status: "pending",
      }),
    ).toBe(false);

    expect(
      isUnacceptedBuyRequest({
        offeredListingId: null,
        requestType: "trade",
        reservationConfirmedAt: null,
        status: "pending",
      }),
    ).toBe(false);

    expect(
      isUnacceptedBuyRequest({
        offeredListingId: null,
        requestType: "buy",
        reservationConfirmedAt: null,
        status: "declined",
      }),
    ).toBe(false);
  });
});

describe("canCancelAcceptedTransaction", () => {
  it("allows either party to cancel an accepted unpaid sale", () => {
    expect(
      canCancelAcceptedTransaction({
        offeredListingId: null,
        paymentStatus: "unpaid",
        requestType: "buy",
        reservationConfirmedAt: "2026-05-14T00:00:00.000Z",
        status: "pending",
      }),
    ).toBe(true);
  });

  it("blocks cancellation before seller acceptance", () => {
    expect(
      canCancelAcceptedTransaction({
        offeredListingId: null,
        paymentStatus: "unpaid",
        requestType: "buy",
        reservationConfirmedAt: null,
        status: "pending",
      }),
    ).toBe(false);
  });

  it("blocks paid sale cancellation", () => {
    expect(
      canCancelAcceptedTransaction({
        offeredListingId: null,
        paymentStatus: "paid",
        requestType: "buy",
        reservationConfirmedAt: "2026-05-14T00:00:00.000Z",
        status: "pending",
      }),
    ).toBe(false);
  });

  it("allows accepted message-only trade cancellation", () => {
    expect(
      canCancelAcceptedTransaction({
        offeredListingId: null,
        paymentStatus: "not_required",
        requestType: "trade",
        reservationConfirmedAt: "2026-05-14T00:00:00.000Z",
        status: "pending",
      }),
    ).toBe(true);
  });
});

describe("canReviewTransactionStatus", () => {
  it("allows completed and accepted-cancelled transactions to be reviewed", () => {
    expect(canReviewTransactionStatus("completed", null)).toBe(true);
    expect(canReviewTransactionStatus("cancelled", "2026-05-14T00:00:00.000Z")).toBe(true);
  });

  it("rejects declined and pre-acceptance cancelled requests", () => {
    expect(canReviewTransactionStatus("declined", null)).toBe(false);
    expect(canReviewTransactionStatus("cancelled", null)).toBe(false);
  });
});
