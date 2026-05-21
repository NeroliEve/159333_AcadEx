import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("public profile previous listings section", () => {
  it("renders previous listings separately from active listings", () => {
    const source = readFileSync("app/(app)/profile/[username]/page.tsx", "utf8");

    expect(source).toContain("Previous listings");
    expect(source).toContain("profile.previousListings");
  });
});
