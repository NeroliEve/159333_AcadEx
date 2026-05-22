import { describe, expect, it } from "vitest";

import {
  canRequestSellerPayment,
  canCompleteTransaction,
  getCheckoutEligibility,
  nzdToMinorUnits,
} from "@/lib/payments";

describe("nzdToMinorUnits", () => {
  it("converts NZD dollar amounts to Stripe minor units", () => {
    expect(nzdToMinorUnits(45)).toBe(4500);
    expect(nzdToMinorUnits(45.5)).toBe(4550);
    expect(nzdToMinorUnits(45.555)).toBe(4556);
  });
});

describe("getCheckoutEligibility", () => {
  const acceptedSale = {
    agreed_price: 45,
    buyer_id: "buyer-1",
    offered_listing_id: null,
    payment_status: "unpaid",
    payment_requested_at: null,
    request_type: "buy",
    reservation_confirmed_at: "2026-05-14T00:00:00.000Z",
    status: "pending",
  } as const;

  it("rejects checkout until the seller requests payment", () => {
    expect(getCheckoutEligibility(acceptedSale, "buyer-1")).toEqual({
      eligible: false,
      reason: "The seller must request payment before the buyer can pay.",
    });
  });

  it("allows the buyer to pay after the seller requests payment", () => {
    expect(getCheckoutEligibility(
      { ...acceptedSale, payment_requested_at: "2026-05-14T01:00:00.000Z" },
      "buyer-1",
    )).toEqual({
      eligible: true,
    });
  });

  it("rejects checkout before seller acceptance", () => {
    expect(
      getCheckoutEligibility(
        { ...acceptedSale, reservation_confirmed_at: null },
        "buyer-1",
      ),
    ).toEqual({
      eligible: false,
      reason: "The seller must accept this request before payment.",
    });
  });

  it("rejects checkout for non-buyers", () => {
    expect(getCheckoutEligibility(acceptedSale, "seller-1")).toEqual({
      eligible: false,
      reason: "Only the buyer can pay for this transaction.",
    });
  });

  it("rejects checkout for trade transactions", () => {
    expect(
      getCheckoutEligibility(
        { ...acceptedSale, offered_listing_id: "listing-2", payment_status: "not_required", request_type: "trade" },
        "buyer-1",
      ),
    ).toEqual({
      eligible: false,
      reason: "Trade transactions do not need Stripe payment.",
    });
  });

  it("rejects checkout for message-only trade transactions", () => {
    expect(
      getCheckoutEligibility(
        { ...acceptedSale, payment_status: "not_required", request_type: "trade" },
        "buyer-1",
      ),
    ).toEqual({
      eligible: false,
      reason: "Trade transactions do not need Stripe payment.",
    });
  });
});

describe("canRequestSellerPayment", () => {
  const acceptedSale = {
    offered_listing_id: null,
    payment_status: "unpaid",
    request_type: "buy",
    reservation_confirmed_at: "2026-05-14T00:00:00.000Z",
    seller_id: "seller-1",
    status: "pending",
  } as const;

  it("allows the seller to request payment for an accepted unpaid sale", () => {
    expect(canRequestSellerPayment(acceptedSale, "seller-1")).toEqual({
      eligible: true,
    });
  });

  it("rejects payment requests from anyone except the seller", () => {
    expect(canRequestSellerPayment(acceptedSale, "buyer-1")).toEqual({
      eligible: false,
      reason: "Only the seller can request payment.",
    });
  });

  it("rejects payment requests before seller acceptance", () => {
    expect(
      canRequestSellerPayment(
        { ...acceptedSale, reservation_confirmed_at: null },
        "seller-1",
      ),
    ).toEqual({
      eligible: false,
      reason: "Accept the request before asking the buyer to pay.",
    });
  });

  it("rejects payment requests for paid transactions", () => {
    expect(
      canRequestSellerPayment(
        { ...acceptedSale, payment_status: "paid" },
        "seller-1",
      ),
    ).toEqual({
      eligible: false,
      reason: "This transaction has already been paid.",
    });
  });

  it("rejects payment requests for message-only trade transactions", () => {
    expect(
      canRequestSellerPayment(
        { ...acceptedSale, payment_status: "not_required", request_type: "trade" },
        "seller-1",
      ),
    ).toEqual({
      eligible: false,
      reason: "Trade transactions do not need Stripe payment.",
    });
  });
});

describe("canCompleteTransaction", () => {
  it("allows completed handover for paid sale transactions", () => {
    expect(
      canCompleteTransaction({
        offered_listing_id: null,
        payment_status: "paid",
        request_type: "buy",
      }),
    ).toBe(true);
  });

  it("allows completed handover for unpaid sale transactions", () => {
    expect(
      canCompleteTransaction({
        offered_listing_id: null,
        payment_status: "unpaid",
        request_type: "buy",
      }),
    ).toBe(true);
  });

  it("allows completed handover for failed-payment sale transactions", () => {
    expect(
      canCompleteTransaction({
        offered_listing_id: null,
        payment_status: "failed",
        request_type: "buy",
      }),
    ).toBe(true);
  });

  it("blocks completed handover while checkout is pending", () => {
    expect(
      canCompleteTransaction({
        offered_listing_id: null,
        payment_status: "checkout_pending",
        request_type: "buy",
      }),
    ).toBe(false);
  });

  it("allows completed handover for trade transactions without payment", () => {
    expect(
      canCompleteTransaction({
        offered_listing_id: "listing-2",
        payment_status: "not_required",
        request_type: "trade",
      }),
    ).toBe(true);
  });

  it("allows completed handover for message-only trade transactions without payment", () => {
    expect(
      canCompleteTransaction({
        offered_listing_id: null,
        payment_status: "not_required",
        request_type: "trade",
      }),
    ).toBe(true);
  });
});
