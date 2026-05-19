type AcademicProfile = {
  degree_id?: number | null;
  university_id?: number | null;
  year_level?: string | null;
};

export function isProfileComplete(profile: AcademicProfile | null | undefined) {
  return !!profile?.university_id && !!profile.degree_id && !!profile.year_level;
}
