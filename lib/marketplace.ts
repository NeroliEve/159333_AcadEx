import type { User } from "@supabase/supabase-js";

import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type {
  PublicEnum,
  TableInsert,
  TableRow,
} from "@/lib/supabase/database.types";

// ─── Shared types ────────────────────────────────────────────────────────────

type ProfileSummary = Pick<
  TableRow<"profiles">,
  | "bio"
  | "id"
  | "email"
  | "first_name"
  | "is_verified"
  | "last_name"
  | "role"
  | "university"
  | "university_id"
  | "username"
>;

type CourseSummary = Pick<
  TableRow<"courses">,
  "course_code" | "course_name" | "id" | "university" | "university_id"
>;

type UniversitySummary = Pick<
  TableRow<"universities">,
  "id" | "is_active" | "name" | "slug"
>;

type StudyAreaSummary = Pick<
  TableRow<"study_areas">,
  "id" | "name" | "slug"
>;

export type ListingCardData = Pick<
  TableRow<"listings">,
  | "author"
  | "condition"
  | "created_at"
  | "description"
  | "edition"
  | "id"
  | "listing_type"
  | "price"
  | "primary_image_url"
  | "status"
  | "title"
> & {
  course: CourseSummary | null;
  seller: ProfileSummary | null;
  study_area: StudyAreaSummary | null;
};

export type ListingDetailData = ListingCardData &
  Pick<TableRow<"listings">, "course_id" | "isbn" | "publisher" | "seller_id" | "study_area_id" | "wanted_trade_text">;

export type ViewerProfile = ProfileSummary;
export type CourseOption = CourseSummary;
export type UniversityOption = UniversitySummary;
export type StudyAreaOption = StudyAreaSummary;
export type ListingCondition = PublicEnum<"listing_condition">;
export type ListingInsert = TableInsert<"listings">;
export type AdminCourse = CourseSummary;

export type PublicProfile = ProfileSummary & {
  listings: ListingCardData[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

// Reused across feed, profile, and detail queries to keep the column list consistent
const LISTING_CARD_SELECT = `
  id,
  title,
  author,
  edition,
  listing_type,
  description,
  price,
  condition,
  status,
  primary_image_url,
  created_at,
  course:courses!listings_course_id_fkey(id, course_code, course_name, university, university_id),
  seller:profiles!listings_seller_id_fkey(id, email, first_name, is_verified, last_name, university, university_id, username),
  study_area:study_areas!listings_study_area_id_fkey(id, name, slug)
`;

// Anonymous feed omits seller data — no profile info shown to logged-out users
const LISTING_CARD_SELECT_ANON = `
  id,
  title,
  author,
  edition,
  listing_type,
  description,
  price,
  condition,
  status,
  primary_image_url,
  created_at,
  course:courses!listings_course_id_fkey(id, course_code, course_name, university, university_id),
  study_area:study_areas!listings_study_area_id_fkey(id, name, slug)
`;

// ─── Viewer ───────────────────────────────────────────────────────────────────

export async function getViewerContext(): Promise<{
  profile: ViewerProfile | null;
  user: User | null;
}> {
  if (!hasEnvVars) return { profile: null, user: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { profile: null, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "bio, id, email, first_name, is_verified, last_name, role, university, university_id, username",
    )
    .eq("id", user.id)
    .maybeSingle();

  return { profile, user };
}

// ─── Listings feed ────────────────────────────────────────────────────────────

export type ListingsFeedFilters = {
  q?: string;
  condition?: string;
  courseId?: number;
  listingType?: string;
  studyAreaId?: number;
  universityId?: number;
  minPrice?: number;
  maxPrice?: number;
};

type ListingsFeedAudience = "anonymous" | "authenticated";

export async function getListingsFeed(
  audience: ListingsFeedAudience,
  filters: ListingsFeedFilters = {},
  limit = 24,
): Promise<{
  error: string | null;
  listings: ListingCardData[];
}> {
  if (!hasEnvVars) {
    return { error: "Supabase environment variables are missing.", listings: [] };
  }

  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(audience === "authenticated" ? LISTING_CARD_SELECT : LISTING_CARD_SELECT_ANON)
    .in("status", ["available", "pending", "sold"])
    .is("deleted_at", null);

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,author.ilike.%${filters.q}%`);
  }

  if (filters.condition) {
    query = query.eq("condition", filters.condition);
  }

  if (filters.listingType) {
    query = query.eq("listing_type", filters.listingType);
  }

  if (filters.studyAreaId) {
    query = query.eq("study_area_id", filters.studyAreaId);
  }

  if (filters.courseId) {
    query = query.eq("course_id", filters.courseId);
  }

  if (filters.universityId) {
    // Supabase doesn't support filtering on a joined table's column directly,
    // so we fetch matching profile IDs first then filter by seller
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("university_id", filters.universityId);

    const sellerIds = (matchingProfiles ?? []).map((p) => p.id);
    if (sellerIds.length === 0) return { error: null, listings: [] };

    query = query.in("seller_id", sellerIds);
  }

  if (filters.minPrice !== undefined) {
    query = query.gte("price", filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    query = query.lte("price", filters.maxPrice);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { error: error.message, listings: [] };

  return {
    error: null,
    listings: (data ?? []) as unknown as ListingCardData[],
  };
}

// ─── Individual listing queries ───────────────────────────────────────────────

export async function getMyListings(userId: string): Promise<ListingCardData[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("seller_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as ListingCardData[];
}

export async function getListingById(id: string): Promise<{
  listing: ListingDetailData | null;
  error: string | null;
}> {
  if (!hasEnvVars) {
    return { listing: null, error: "Supabase environment variables are missing." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(`${LISTING_CARD_SELECT}, seller_id, course_id, isbn, publisher, study_area_id, wanted_trade_text`)
    .eq("id", id)
    .maybeSingle();

  if (error) return { listing: null, error: error.message };
  return { listing: data as unknown as ListingDetailData, error: null };
}

// ─── Public profile ───────────────────────────────────────────────────────────

export async function getPublicProfile(username: string): Promise<{
  profile: PublicProfile | null;
  error: string | null;
}> {
  if (!hasEnvVars) {
    return { profile: null, error: "Supabase environment variables are missing." };
  }

  const supabase = await createClient();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select(
      "bio, id, email, first_name, is_verified, last_name, role, university, university_id, username",
    )
    .eq("username", username)
    .maybeSingle();

  if (profileError) return { profile: null, error: profileError.message };
  if (!profileData) return { profile: null, error: null };

  const { data: listingsData } = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("seller_id", profileData.id)
    .in("status", ["available", "pending"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return {
    profile: {
      ...profileData,
      listings: (listingsData ?? []) as unknown as ListingCardData[],
    },
    error: null,
  };
}

// ─── Course & university options ──────────────────────────────────────────────

export async function getCourseOptions(limit = 100): Promise<CourseOption[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, course_code, course_name, university, university_id")
    .order("course_code", { ascending: true })
    .limit(limit);

  return data ?? [];
}

// Admin pages need a higher limit since they show the full course list
export async function getAdminCourses(): Promise<AdminCourse[]> {
  return getCourseOptions(200);
}

export async function getStudyAreaOptions(): Promise<StudyAreaOption[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("study_areas")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name", { ascending: true });

  return data ?? [];
}

export async function getUniversityOptions(
  includeInactive = false,
  limit = 100,
): Promise<UniversityOption[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  let query = supabase
    .from("universities")
    .select("id, is_active, name, slug")
    .order("name", { ascending: true })
    .limit(limit);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data } = await query;
  return data ?? [];
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function getProfileDisplayName(
  profile: ViewerProfile | null,
  emailFallback?: string | null,
) {
  if (!profile) return emailFallback ?? "Student";

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  if (fullName) return fullName;
  if (profile.username) return profile.username;

  return profile.email ?? emailFallback ?? "Student";
}

export function formatListingCondition(condition: ListingCondition) {
  switch (condition) {
    case "like_new":
      return "Like new";
    default:
      return `${condition.charAt(0).toUpperCase()}${condition.slice(1)}`;
  }
}

export function formatPrice(price: number | null) {
  if (price == null) return "Price on request";

  return new Intl.NumberFormat("en-NZ", {
    currency: "NZD",
    style: "currency",
    maximumFractionDigits: 0,
  }).format(price);
}
