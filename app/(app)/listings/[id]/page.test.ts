import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("listing detail sold listing access", () => {
  it("does not gate sold listings behind archived participant access checks", () => {
    const source = readFileSync("app/(app)/listings/[id]/page.tsx", "utf8");

    expect(source).not.toContain("canViewArchivedListing");
  });
});
