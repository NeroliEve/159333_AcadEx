import { describe, expect, it } from "vitest";

import {
  buildClearFiltersHref,
  buildRemoveFilterHref,
  buildSearchFilterHref,
  getBrowseSearchContext,
} from "@/lib/browse-search";

describe("browse search URL helpers", () => {
  it("preserves AI context and hidden seller filters when applying visible filters", () => {
    const href = buildSearchFilterHref(
      new URLSearchParams({
        _ai: "Found books from Alex.",
        aiBaseSellerName: "Alex",
        aiQuery: "books from Alex",
        mode: "ai",
        sellerName: "Alex",
      }),
      {
        condition: "good",
        courseId: "",
        listingType: "",
        maxPrice: "80",
        minPrice: "20",
        q: "",
        sort: "price_asc",
        studyAreaId: "",
        universityId: "",
      },
    );

    expect(href).toBe(
      "/browse?_ai=Found+books+from+Alex.&aiBaseSellerName=Alex&aiQuery=books+from+Alex&mode=ai&sellerName=Alex&condition=good&minPrice=20&maxPrice=80&sort=price_asc",
    );
  });

  it("clears AI refinements by restoring the stored AI base filters", () => {
    const href = buildClearFiltersHref(
      new URLSearchParams({
        _ai: "Found programming books at Massey.",
        aiBaseQ: "programming",
        aiBaseUniversityId: "5",
        aiQuery: "cheap programming book for Massey",
        condition: "good",
        maxPrice: "60",
        mode: "ai",
        q: "programming",
        sort: "price_asc",
        universityId: "5",
      }),
    );

    expect(href).toBe(
      "/browse?mode=ai&aiQuery=cheap+programming+book+for+Massey&_ai=Found+programming+books+at+Massey.&aiBaseQ=programming&aiBaseUniversityId=5&q=programming&universityId=5",
    );
  });

  it("clears regular searches back to the base browse page", () => {
    expect(
      buildClearFiltersHref(
        new URLSearchParams("mode=keyword&q=biology&condition=good&sort=price_desc"),
      ),
    ).toBe("/browse");
  });

  it("removes one filter chip while keeping the rest of the search context", () => {
    const href = buildRemoveFilterHref(
      new URLSearchParams({
        aiBaseQ: "biology",
        aiQuery: "biology textbook",
        condition: "good",
        mode: "ai",
        q: "biology",
        sellerName: "Alex",
      }),
      "condition",
    );

    expect(href).toBe(
      "/browse?aiBaseQ=biology&aiQuery=biology+textbook&mode=ai&q=biology&sellerName=Alex",
    );
  });

  it("describes AI and keyword search contexts for the result header", () => {
    expect(
      getBrowseSearchContext(
        new URLSearchParams("mode=ai&aiQuery=cheap%20first%20year%20programming"),
      ),
    ).toEqual({
      label: 'AI search: "cheap first year programming"',
      mode: "ai",
    });

    expect(getBrowseSearchContext(new URLSearchParams("q=biology"))).toEqual({
      label: 'Showing results for "biology"',
      mode: "keyword",
    });
  });
});
