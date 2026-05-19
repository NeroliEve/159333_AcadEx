import { describe, expect, it } from "vitest";

import { parseAcademicProfileFields } from "@/lib/profile-validation";

describe("parseAcademicProfileFields", () => {
  it("accepts valid university, degree, and year level fields", () => {
    expect(
      parseAcademicProfileFields({
        degreeId: "3",
        universityId: "7",
        yearLevel: "postgraduate",
      }),
    ).toEqual({
      degreeId: 3,
      errors: {},
      universityId: 7,
      yearLevel: "postgraduate",
    });
  });

  it("rejects missing required academic fields", () => {
    expect(parseAcademicProfileFields({})).toEqual({
      degreeId: null,
      errors: {
        degreeId: "Choose your degree.",
        universityId: "Choose your university.",
        yearLevel: "Choose your year level.",
      },
      universityId: null,
      yearLevel: null,
    });
  });

  it("rejects invalid numeric identifiers and year levels", () => {
    expect(
      parseAcademicProfileFields({
        degreeId: "abc",
        universityId: "-1",
        yearLevel: "sixth",
      }),
    ).toEqual({
      degreeId: null,
      errors: {
        degreeId: "Choose a valid degree.",
        universityId: "Choose a valid university.",
        yearLevel: "Choose a valid year level.",
      },
      universityId: null,
      yearLevel: null,
    });
  });
});
