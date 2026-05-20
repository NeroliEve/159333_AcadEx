import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("browse page AI search access", () => {
  it("renders the AI search bar only for signed-in users", () => {
    const source = readFileSync("app/(app)/browse/page.tsx", "utf8");

    expect(source).toContain("{user ? <AiSearchBar /> : null}");
  });

  it("passes the durable search context into the browse panel", () => {
    const source = readFileSync("app/(app)/browse/page.tsx", "utf8");

    expect(source).toContain("getBrowseSearchContext");
    expect(source).toContain("searchContext={searchContext}");
  });

  it("keeps separate clear-filter and start-over actions in the search filter bar", () => {
    const source = readFileSync("components/search-filter-bar.tsx", "utf8");

    expect(source).toContain("Clear filters");
    expect(source).toContain("Start over");
  });
});
