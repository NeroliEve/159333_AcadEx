import { describe, expect, it } from "vitest";

import {
  calculateWalletBalance,
  validateWithdrawalAmount,
} from "@/lib/wallet";

describe("calculateWalletBalance", () => {
  it("adds sale credits and subtracts withdrawal debits", () => {
    expect(
      calculateWalletBalance([
        { amount: 65, type: "sale" },
        { amount: 20, type: "withdrawal" },
        { amount: 15.5, type: "sale" },
      ]),
    ).toBe(60.5);
  });
});

describe("validateWithdrawalAmount", () => {
  it("accepts positive amounts up to the available balance", () => {
    expect(validateWithdrawalAmount(25, 30)).toEqual({ valid: true });
  });

  it("rejects zero and negative amounts", () => {
    expect(validateWithdrawalAmount(0, 30)).toEqual({
      reason: "Enter an amount greater than $0.",
      valid: false,
    });
    expect(validateWithdrawalAmount(-1, 30)).toEqual({
      reason: "Enter an amount greater than $0.",
      valid: false,
    });
  });

  it("rejects withdrawals larger than the available balance", () => {
    expect(validateWithdrawalAmount(35, 30)).toEqual({
      reason: "You cannot withdraw more than your available balance.",
      valid: false,
    });
  });
});
