import { describe, expect, it } from "vitest";

import {
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
    reservation_confirmed_at: "2026-05-14T00:00:00.000Z",
    status: "pending",
  } as const;

  it("allows the buyer to pay an accepted unpaid sale transaction", () => {
    expect(getCheckoutEligibility(acceptedSale, "buyer-1")).toEqual({
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
        { ...acceptedSale, offered_listing_id: "listing-2", payment_status: "not_required" },
        "buyer-1",
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
      }),
    ).toBe(true);
  });

  it("blocks completed handover for unpaid sale transactions", () => {
    expect(
      canCompleteTransaction({
        offered_listing_id: null,
        payment_status: "unpaid",
      }),
    ).toBe(false);
  });

  it("allows completed handover for trade transactions without payment", () => {
    expect(
      canCompleteTransaction({
        offered_listing_id: "listing-2",
        payment_status: "not_required",
      }),
    ).toBe(true);
  });
});
