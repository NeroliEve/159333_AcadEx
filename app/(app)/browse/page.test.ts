import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("browse page AI search access", () => {
  it("renders the AI search bar only for signed-in users", () => {
    const source = readFileSync("app/(app)/browse/page.tsx", "utf8");

    expect(source).toContain("{user ? <AiSearchBar /> : null}");
  });
});
