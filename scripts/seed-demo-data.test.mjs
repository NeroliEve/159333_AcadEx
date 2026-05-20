import { describe, expect, it } from "vitest";

import {
  buildDemoSeedPlan,
  createDemoListingPhotoPng,
  isLocalSupabaseUrl,
  parseEnvFile,
  validateRunTarget,
} from "./seed-demo-data.mjs";

const studyAreas = [
  ["business-commerce", "Business & Commerce"],
  ["science-mathematics", "Science & Mathematics"],
  ["information-technology", "Information Technology"],
  ["arts-humanities", "Arts & Humanities"],
  ["law", "Law"],
  ["health-medicine", "Health & Medicine"],
  ["engineering", "Engineering"],
  ["education", "Education"],
  ["social-sciences", "Social Sciences"],
  ["architecture-design", "Architecture & Design"],
  ["agriculture-environment", "Agriculture & Environment"],
  ["music-performing-arts", "Music & Performing Arts"],
].map(([slug, name], index) => ({
  id: index + 1,
  name,
  slug,
}));

const universities = [
  "university-of-auckland",
  "auckland-university-of-technology",
  "university-of-waikato",
  "massey-university",
  "victoria-university-of-wellington",
  "university-of-canterbury",
  "lincoln-university",
  "university-of-otago",
].map((slug, index) => ({
  id: index + 20,
  name: slug.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
  slug,
}));

const degreeSlugsByArea = new Map([
  ["business-commerce", "business"],
  ["science-mathematics", "science"],
  ["information-technology", "computer-science"],
  ["arts-humanities", "arts"],
  ["law", "law"],
  ["health-medicine", "health-science"],
  ["engineering", "engineering"],
  ["education", "education"],
  ["social-sciences", "social-sciences"],
  ["architecture-design", "design"],
  ["agriculture-environment", "agriculture-environment"],
  ["music-performing-arts", "music-performing-arts"],
]);

const degrees = studyAreas.map((area, index) => ({
  id: index + 40,
  name: area.name,
  slug: degreeSlugsByArea.get(area.slug),
  study_area_id: area.id,
}));

const courseCodes = [
  "ACCTG101",
  "ECON101",
  "MKTG101",
  "STATS101",
  "BIOSCI101",
  "CHEM111",
  "COMPSCI101",
  "COMPSCI220",
  "COMP102",
  "ENGL101",
  "PHIL101",
  "LAWGEN101",
  "LAWS111",
  "MEDSCI142",
  "NURS501",
  "ENGGEN121",
  "ENGR101",
  "PSYCH101",
  "PSYC221",
  "AGRI101",
  "ENVS101",
];

const courses = courseCodes.map((courseCode, index) => ({
  id: index + 60,
  course_code: courseCode,
  course_name: `${courseCode} Test Course`,
  university_id: universities[index % universities.length].id,
}));

describe("seed-demo-data helpers", () => {
  it("parses dotenv-style files without overriding existing process env", () => {
    const env = parseEnvFile(
      [
        "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321",
        "SUPABASE_SERVICE_ROLE_KEY='local key'",
        "IGNORED",
        "EMPTY_VALUE=",
        "# comment",
      ].join("\n"),
      { SUPABASE_SERVICE_ROLE_KEY: "already-set" },
    );

    expect(env).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SERVICE_ROLE_KEY: "already-set",
      EMPTY_VALUE: "",
    });
  });

  it("allows local Supabase URLs and blocks remote URLs unless explicitly confirmed", () => {
    expect(isLocalSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
    expect(isLocalSupabaseUrl("https://example.supabase.co")).toBe(false);

    expect(() =>
      validateRunTarget({
        allowRemoteFlag: false,
        env: {},
        supabaseUrl: "https://example.supabase.co",
      }),
    ).toThrow(/refusing to seed a non-local Supabase project/i);

    expect(() =>
      validateRunTarget({
        allowRemoteFlag: true,
        env: { ACADEX_ALLOW_REMOTE_DEMO_SEED: "true" },
        supabaseUrl: "https://example.supabase.co",
      }),
    ).not.toThrow();
  });

  it("builds exactly 12 demo users and 48 listings across all study areas", () => {
    const plan = buildDemoSeedPlan({ courses, degrees, studyAreas, universities });

    expect(plan.users).toHaveLength(12);
    expect(plan.users.every((user) => user.email.endsWith("@acadex.test"))).toBe(true);
    expect(new Set(plan.users.map((user) => user.email)).size).toBe(12);

    expect(plan.listings).toHaveLength(48);
    expect(plan.listings.filter((listing) => listing.includeImage)).toHaveLength(48);

    const listingsByArea = new Map();
    for (const listing of plan.listings) {
      listingsByArea.set(
        listing.studyAreaSlug,
        (listingsByArea.get(listing.studyAreaSlug) ?? 0) + 1,
      );
      expect(["sale_only", "trade_only", "sale_or_trade"]).toContain(listing.listing_type);
      expect(["new", "like_new", "good", "fair", "poor"]).toContain(listing.condition);
      if (listing.listing_type === "trade_only") {
        expect(listing.price).toBeNull();
        expect(listing.wanted_trade_text).toEqual(expect.any(String));
      }
      if (listing.listing_type === "sale_or_trade") {
        expect(listing.price).toBeGreaterThan(0);
        expect(listing.wanted_trade_text).toEqual(expect.any(String));
      }
    }

    expect([...listingsByArea.values()]).toEqual(new Array(12).fill(4));
  });

  it("generates demo-safe raster PNG listing photos", async () => {
    const png = await createDemoListingPhotoPng({
      accent: "#2563eb",
      areaName: "Information Technology",
      title: "Clean Code",
    });

    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(png.byteLength).toBeGreaterThan(10_000);
  });
});
