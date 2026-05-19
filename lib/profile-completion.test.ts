import { describe, expect, it } from "vitest";

import { isProfileComplete } from "@/lib/profile-completion";

describe("isProfileComplete", () => {
  const completeProfile = {
    degree_id: 4,
    university_id: 2,
    year_level: "2",
  };

  it("returns true when university, degree, and year level are present", () => {
    expect(isProfileComplete(completeProfile)).toBe(true);
  });

  it("returns false when university is missing", () => {
    expect(isProfileComplete({ ...completeProfile, university_id: null })).toBe(false);
  });

  it("returns false when degree is missing", () => {
    expect(isProfileComplete({ ...completeProfile, degree_id: null })).toBe(false);
  });

  it("returns false when year level is missing", () => {
    expect(isProfileComplete({ ...completeProfile, year_level: null })).toBe(false);
  });
});
