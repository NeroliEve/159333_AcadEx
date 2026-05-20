import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("listing manage menu saved-listing access", () => {
  it("lets managed listing cards pass saved state into the dropdown", () => {
    const listingCard = source("components/listing-card.tsx");

    expect(listingCard).toMatch(/<ListingManageMenu(?:(?!\/>).)*initialSaved={isSaved}/s);
  });

  it("includes a favorite action in the manage dropdown", () => {
    const listingManageMenu = source("components/listing-manage-menu.tsx");

    expect(listingManageMenu).toContain("SaveListingMenuItem");
  });
});
