export const YEAR_LEVEL_OPTIONS = [
  { label: "Year 1", value: "1" },
  { label: "Year 2", value: "2" },
  { label: "Year 3", value: "3" },
  { label: "Year 4", value: "4" },
  { label: "Year 5", value: "5" },
  { label: "Postgraduate", value: "postgraduate" },
] as const;

export type AcademicYearLevel = (typeof YEAR_LEVEL_OPTIONS)[number]["value"];

type AcademicFieldErrors = {
  degreeId?: string;
  universityId?: string;
  yearLevel?: string;
};

function parseRequiredPositiveInteger(
  value: unknown,
  missingMessage: string,
  invalidMessage: string,
) {
  const raw =
    typeof value === "string" || typeof value === "number"
      ? String(value).trim()
      : "";

  if (!raw) {
    return { error: missingMessage, value: null };
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { error: invalidMessage, value: null };
  }

  return { error: null, value: parsed };
}

export function isAcademicYearLevel(value: string): value is AcademicYearLevel {
  return YEAR_LEVEL_OPTIONS.some((option) => option.value === value);
}

export function parseAcademicProfileFields(body: Record<string, unknown>) {
  const university = parseRequiredPositiveInteger(
    body.universityId,
    "Choose your university.",
    "Choose a valid university.",
  );
  const degree = parseRequiredPositiveInteger(
    body.degreeId,
    "Choose your degree.",
    "Choose a valid degree.",
  );
  const rawYearLevel = typeof body.yearLevel === "string" ? body.yearLevel.trim() : "";
  const errors: AcademicFieldErrors = {};

  if (university.error) errors.universityId = university.error;
  if (degree.error) errors.degreeId = degree.error;

  let yearLevel: AcademicYearLevel | null = null;
  if (!rawYearLevel) {
    errors.yearLevel = "Choose your year level.";
  } else if (!isAcademicYearLevel(rawYearLevel)) {
    errors.yearLevel = "Choose a valid year level.";
  } else {
    yearLevel = rawYearLevel;
  }

  return {
    degreeId: degree.value,
    errors,
    universityId: university.value,
    yearLevel,
  };
}
