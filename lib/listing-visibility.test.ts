import { describe, expect, it } from "vitest";

import {
  getVisibleSellerUniversity,
  isMissingSellerUniversityColumnError,
} from "@/lib/listing-visibility";

describe("getVisibleSellerUniversity", () => {
  it("returns the seller university when the listing allows it", () => {
    expect(
      getVisibleSellerUniversity({
        seller: { university: "Massey University" },
        show_seller_university: true,
      }),
    ).toBe("Massey University");
  });

  it("hides the seller university when the listing disables it", () => {
    expect(
      getVisibleSellerUniversity({
        seller: { university: "Massey University" },
        show_seller_university: false,
      }),
    ).toBeNull();
  });
});

describe("isMissingSellerUniversityColumnError", () => {
  it("matches Postgres missing-column errors for the listing visibility field", () => {
    expect(
      isMissingSellerUniversityColumnError({
        code: "42703",
        message: "column listings.show_seller_university does not exist",
      }),
    ).toBe(true);
  });

  it("matches Supabase schema-cache errors for the listing visibility field", () => {
    expect(
      isMissingSellerUniversityColumnError({
        code: "PGRST204",
        message:
          "Could not find the 'show_seller_university' column of 'listings' in the schema cache",
      }),
    ).toBe(true);
  });

  it("does not match unrelated database errors", () => {
    expect(
      isMissingSellerUniversityColumnError({
        code: "42703",
        message: "column listings.title does not exist",
      }),
    ).toBe(false);
  });
});
