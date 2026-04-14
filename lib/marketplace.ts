import type { User } from "@supabase/supabase-js";

import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import type {
  PublicEnum,
  TableInsert,
  TableRow,
} from "@/lib/supabase/database.types";

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

export type ListingCardData = Pick<
  TableRow<"listings">,
  | "author"
  | "condition"
  | "created_at"
  | "description"
  | "id"
  | "price"
  | "primary_image_url"
  | "status"
  | "title"
> & {
  course: CourseSummary | null;
  seller: ProfileSummary | null;
};

export type ListingDetailData = ListingCardData &
  Pick<TableRow<"listings">, "course_id" | "seller_id">;

export type ViewerProfile = ProfileSummary;
export type CourseOption = CourseSummary;
export type UniversityOption = UniversitySummary;
export type ListingCondition = PublicEnum<"listing_condition">;
export type ListingInsert = TableInsert<"listings">;
export type AdminCourse = CourseSummary;

type ListingsFeedAudience = "anonymous" | "authenticated";

export async function getViewerContext(): Promise<{
  profile: ViewerProfile | null;
  user: User | null;
}> {
  if (!hasEnvVars) {
    return {
      profile: null,
      user: null,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      profile: null,
      user: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "bio, id, email, first_name, is_verified, last_name, role, university, university_id, username",
    )
    .eq("id", user.id)
    .maybeSingle();

  return {
    profile,
    user,
  };
}

export async function getListingsFeed(
  audience: ListingsFeedAudience,
  limit = 24,
): Promise<{
  error: string | null;
  listings: ListingCardData[];
}> {
  if (!hasEnvVars) {
    return {
      error: "Supabase environment variables are missing.",
      listings: [],
    };
  }

  const supabase = await createClient();
  const selectClause =
    audience === "authenticated"
      ? `
        id,
        title,
        author,
        description,
        price,
        condition,
        status,
        primary_image_url,
        created_at,
        course:courses!listings_course_id_fkey(id, course_code, course_name, university, university_id),
        seller:profiles!listings_seller_id_fkey(id, email, first_name, is_verified, last_name, university, university_id, username)
      `
      : `
        id,
        title,
        author,
        description,
        price,
        condition,
        status,
        primary_image_url,
        created_at,
        course:courses!listings_course_id_fkey(id, course_code, course_name, university, university_id)
      `;

  const { data, error } = await supabase
    .from("listings")
    .select(selectClause)
    .in("status", ["available", "pending", "sold"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return {
      error: error.message,
      listings: [],
    };
  }

  return {
    error: null,
    listings: (data ?? []) as unknown as ListingCardData[],
  };
}

export async function getMyListings(userId: string): Promise<ListingCardData[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(`
      id,
      title,
      author,
      description,
      price,
      condition,
      status,
      primary_image_url,
      created_at,
      course:courses!listings_course_id_fkey(id, course_code, course_name, university, university_id),
      seller:profiles!listings_seller_id_fkey(id, email, first_name, is_verified, last_name, university, university_id, username)
    `)
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
    return {
      listing: null,
      error: "Supabase environment variables are missing.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      id,
      title,
      author,
      description,
      price,
      condition,
      status,
      primary_image_url,
      created_at,
      seller_id,
      course_id,
      course:courses!listings_course_id_fkey(id, course_code, course_name, university, university_id),
      seller:profiles!listings_seller_id_fkey(id, email, first_name, is_verified, last_name, university, university_id, username)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return { listing: null, error: error.message };
  return { listing: data as unknown as ListingDetailData, error: null };
}

export async function getCourseOptions(limit = 100): Promise<CourseOption[]> {
  if (!hasEnvVars) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, course_code, course_name, university, university_id")
    .order("course_code", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getAdminCourses(limit = 200): Promise<AdminCourse[]> {
  if (!hasEnvVars) {
    return [];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, course_code, course_name, university, university_id")
    .order("course_code", { ascending: true })
    .limit(limit);

  return data ?? [];
}

export async function getUniversityOptions(
  includeInactive = false,
  limit = 100,
): Promise<UniversityOption[]> {
  if (!hasEnvVars) {
    return [];
  }

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

export function getProfileDisplayName(
  profile: ViewerProfile | null,
  emailFallback?: string | null,
) {
  if (!profile) {
    return emailFallback ?? "Student";
  }

  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  if (fullName) {
    return fullName;
  }

  if (profile.username) {
    return profile.username;
  }

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
  if (price == null) {
    return "Price on request";
  }

  return new Intl.NumberFormat("en-NZ", {
    currency: "NZD",
    style: "currency",
    maximumFractionDigits: 0,
  }).format(price);
}
