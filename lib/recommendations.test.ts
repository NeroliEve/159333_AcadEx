import { describe, expect, it } from "vitest";

import { getRecommendedListingsForProfile } from "@/lib/recommendations";

type TestListing = Parameters<typeof getRecommendedListingsForProfile>[0]["listings"][number];

function listing(overrides: Partial<TestListing> & Pick<TestListing, "id">): TestListing {
  const { id, ...rest } = overrides;

  return {
    course: null,
    created_at: "2026-05-01T00:00:00.000Z",
    id,
    seller: {
      id: `seller-${id}`,
      university_id: null,
    },
    status: "available",
    study_area: null,
    ...rest,
  };
}

describe("getRecommendedListingsForProfile", () => {
  const completeProfile = {
    degreeStudyAreaId: 10,
    id: "viewer",
    universityId: 20,
  };

  it("ranks combined degree and university matches highest", () => {
    const result = getRecommendedListingsForProfile({
      listings: [
        listing({
          course: { university_id: 20 },
          id: "combined",
          study_area: { id: 10 },
        }),
        listing({
          id: "degree-only",
          study_area: { id: 10 },
        }),
        listing({
          course: { university_id: 20 },
          id: "university-only",
        }),
      ],
      profile: completeProfile,
    });

    expect(result.map((item) => item.id)).toEqual([
      "combined",
      "degree-only",
      "university-only",
    ]);
  });

  it("ranks degree matches above unrelated listings", () => {
    const result = getRecommendedListingsForProfile({
      listings: [
        listing({ id: "unrelated", study_area: { id: 99 } }),
        listing({ id: "degree", study_area: { id: 10 } }),
      ],
      profile: completeProfile,
    });

    expect(result.map((item) => item.id)).toEqual(["degree", "unrelated"]);
  });

  it("ranks university matches above unrelated listings", () => {
    const result = getRecommendedListingsForProfile({
      listings: [
        listing({ id: "unrelated" }),
        listing({
          id: "course-university",
          course: { university_id: 20 },
        }),
        listing({
          id: "seller-university",
          seller: { id: "seller", university_id: 20 },
        }),
      ],
      profile: completeProfile,
    });

    expect(result.map((item) => item.id)).toEqual([
      "course-university",
      "seller-university",
      "unrelated",
    ]);
  });

  it("excludes listings owned by the viewer", () => {
    const result = getRecommendedListingsForProfile({
      listings: [
        listing({
          id: "own",
          seller: { id: "viewer", university_id: 20 },
          study_area: { id: 10 },
        }),
        listing({ id: "other" }),
      ],
      profile: completeProfile,
    });

    expect(result.map((item) => item.id)).toEqual(["other"]);
  });

  it("fills sparse matches with latest available listings", () => {
    const result = getRecommendedListingsForProfile({
      limit: 3,
      listings: [
        listing({
          created_at: "2026-05-01T00:00:00.000Z",
          id: "old-fallback",
        }),
        listing({
          created_at: "2026-05-03T00:00:00.000Z",
          id: "new-fallback",
        }),
        listing({
          created_at: "2026-05-02T00:00:00.000Z",
          id: "match",
          study_area: { id: 10 },
        }),
      ],
      profile: completeProfile,
    });

    expect(result.map((item) => item.id)).toEqual([
      "match",
      "new-fallback",
      "old-fallback",
    ]);
  });

  it("prioritizes available listings over unavailable listings with the same match strength", () => {
    const result = getRecommendedListingsForProfile({
      listings: [
        listing({
          id: "pending",
          status: "pending",
          study_area: { id: 10 },
        }),
        listing({
          id: "available",
          status: "available",
          study_area: { id: 10 },
        }),
      ],
      profile: completeProfile,
    });

    expect(result.map((item) => item.id)).toEqual(["available", "pending"]);
  });

  it("returns no recommendations for incomplete profiles", () => {
    const result = getRecommendedListingsForProfile({
      listings: [
        listing({
          id: "listing",
          study_area: { id: 10 },
        }),
      ],
      profile: {
        degreeStudyAreaId: null,
        id: "viewer",
        universityId: 20,
      },
    });

    expect(result).toEqual([]);
  });
});
