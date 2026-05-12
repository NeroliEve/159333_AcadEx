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
  | "account_status"
  | "avatar_url"
  | "bio"
  | "id"
  | "email"
  | "first_name"
  | "is_verified"
  | "last_name"
  | "role"
  | "suspended_at"
  | "transactions_seen_at"
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

export type ListingImageData = Pick<
  TableRow<"listing_images">,
  "id" | "image_url" | "is_primary" | "sort_order"
>;

type ListingImageRow = ListingImageData & Pick<TableRow<"listing_images">, "listing_id">;

type ListingCardBase = Pick<
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

export type ListingCardData = ListingCardBase & {
  images: ListingImageData[];
};

export type ListingDetailData = ListingCardData &
  Pick<TableRow<"listings">, "course_id" | "isbn" | "publisher" | "seller_id" | "study_area_id" | "wanted_trade_text"> & {
    images: ListingImageData[];
  };

export type ViewerProfile = ProfileSummary;
export type CourseOption = CourseSummary;
export type UniversityOption = UniversitySummary;
export type StudyAreaOption = StudyAreaSummary;
export type ListingCondition = PublicEnum<"listing_condition">;
export type ListingType = PublicEnum<"listing_type">;
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
  seller:profiles!listings_seller_id_fkey(id, avatar_url, first_name, is_verified, last_name, university, university_id, username),
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

async function attachListingImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listings: ListingCardBase[],
): Promise<ListingCardData[]> {
  if (listings.length === 0) return [];

  const { data, error } = await supabase
    .from("listing_images")
    .select("id, listing_id, image_url, is_primary, sort_order")
    .in("listing_id", listings.map((listing) => listing.id))
    .order("sort_order", { ascending: true });

  if (error) {
    return listings.map((listing) => ({
      ...listing,
      images: listing.primary_image_url
        ? [{
            id: `primary-${listing.id}`,
            image_url: listing.primary_image_url,
            is_primary: true,
            sort_order: 0,
          }]
        : [],
    }));
  }

  const imagesByListing = new Map<string, ListingImageData[]>();

  for (const image of (data ?? []) as ListingImageRow[]) {
    const currentImages = imagesByListing.get(image.listing_id) ?? [];
    currentImages.push({
      id: image.id,
      image_url: image.image_url,
      is_primary: image.is_primary,
      sort_order: image.sort_order,
    });
    imagesByListing.set(image.listing_id, currentImages);
  }

  return listings.map((listing) => {
    const images = imagesByListing.get(listing.id);

    return {
      ...listing,
      images: images && images.length > 0
        ? images
        : listing.primary_image_url
          ? [{
              id: `primary-${listing.id}`,
              image_url: listing.primary_image_url,
              is_primary: true,
              sort_order: 0,
            }]
          : [],
    };
  });
}

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
      "account_status, avatar_url, bio, id, email, first_name, is_verified, last_name, role, suspended_at, transactions_seen_at, university, university_id, username",
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
  sellerName?: string;
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
  const { data: { user } } = await supabase.auth.getUser();

  let blockedIds: string[] = [];
  if (user) {
    const { data: blocks } = await supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", user.id);
    blockedIds = (blocks ?? []).map((row) => row.blocked_id);
  }

  let query = supabase
    .from("listings")
    .select(audience === "authenticated" ? LISTING_CARD_SELECT : LISTING_CARD_SELECT_ANON)
    .in("status", ["available", "pending", "sold"])
    .is("deleted_at", null);

  if (blockedIds.length > 0) {
    query = query.not("seller_id", "in", `(${blockedIds.join(",")})`);
  }

  if (filters.q) {
    query = query.or(`title.ilike.%${filters.q}%,author.ilike.%${filters.q}%`);
  }

  if (filters.condition) {
    query = query.eq("condition", filters.condition as ListingCondition);
  }

  if (filters.listingType) {
    query = query.eq("listing_type", filters.listingType as ListingType);
  }

  if (filters.studyAreaId) {
    query = query.eq("study_area_id", filters.studyAreaId);
  }

  if (filters.courseId) {
    query = query.eq("course_id", filters.courseId);
  }

  if (filters.universityId) {
    // Match listings where the seller is from this university OR the listing's course belongs to this university
    const [{ data: matchingProfiles }, { data: matchingCourses }] = await Promise.all([
      supabase.from("profiles").select("id").eq("university_id", filters.universityId),
      supabase.from("courses").select("id").eq("university_id", filters.universityId),
    ]);

    const sellerIds = (matchingProfiles ?? []).map((p) => p.id);
    const courseIds = (matchingCourses ?? []).map((c) => c.id);

    const orParts: string[] = [];
    if (sellerIds.length > 0) orParts.push(`seller_id.in.(${sellerIds.join(",")})`);
    if (courseIds.length > 0) orParts.push(`course_id.in.(${courseIds.join(",")})`);

    if (orParts.length === 0) return { error: null, listings: [] };

    query = query.or(orParts.join(","));
  }

  if (filters.sellerName) {
    const { data: matchingProfiles } = await supabase
      .from("profiles")
      .select("id")
      .or(
        `username.ilike.%${filters.sellerName}%,first_name.ilike.%${filters.sellerName}%,last_name.ilike.%${filters.sellerName}%`,
      );

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
    listings: await attachListingImages(supabase, (data ?? []) as unknown as ListingCardBase[]),
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

  return attachListingImages(supabase, (data ?? []) as unknown as ListingCardBase[]);
}

// Listings owned by the user that are still available to offer in a trade.
export async function getMyAvailableListings(
  userId: string,
): Promise<
  Array<{
    id: string;
    title: string;
    primary_image_url: string | null;
    price: number | null;
    listing_type: ListingType;
  }>
> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id, title, primary_image_url, price, listing_type")
    .eq("seller_id", userId)
    .eq("status", "available")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as Array<{
    id: string;
    title: string;
    primary_image_url: string | null;
    price: number | null;
    listing_type: ListingType;
  }>;
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
  if (!data) return { listing: null, error: null };

  const { data: images, error: imagesError } = await supabase
    .from("listing_images")
    .select("id, image_url, is_primary, sort_order")
    .eq("listing_id", id)
    .order("sort_order", { ascending: true });

  if (imagesError) return { listing: null, error: imagesError.message };

  return {
    listing: {
      ...(data as unknown as Omit<ListingDetailData, "images">),
      images: (images ?? []) as ListingImageData[],
    },
    error: null,
  };
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
      "account_status, avatar_url, bio, id, email, first_name, is_verified, last_name, role, suspended_at, transactions_seen_at, university, university_id, username",
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

  const listings = await attachListingImages(
    supabase,
    (listingsData ?? []) as unknown as ListingCardBase[],
  );

  return {
    profile: {
      ...profileData,
      listings,
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

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TransactionData = {
  id: string;
  listing_id: string;
  offered_listing_id: string | null;
  conversation_id: string | null;
  buyer_id: string;
  seller_id: string;
  agreed_price: number | null;
  agreed_trade_text: string | null;
  status: PublicEnum<"transaction_status">;
  seller_confirmed_completed: boolean;
  reservation_confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  listing: Pick<TableRow<"listings">, "id" | "title" | "primary_image_url" | "price" | "condition"> | null;
  offered_listing: Pick<TableRow<"listings">, "id" | "title" | "primary_image_url" | "price" | "condition"> | null;
  buyer: Pick<TableRow<"profiles">, "id" | "first_name" | "last_name" | "username" | "avatar_url"> | null;
  seller: Pick<TableRow<"profiles">, "id" | "first_name" | "last_name" | "username" | "avatar_url"> | null;
};

const TRANSACTION_SELECT = `
  id, listing_id, offered_listing_id, conversation_id, buyer_id, seller_id, agreed_price, agreed_trade_text,
  status, seller_confirmed_completed, reservation_confirmed_at,
  completed_at, cancelled_at, created_at, updated_at,
  listing:listings!transactions_listing_id_fkey(id, title, primary_image_url, price, condition),
  offered_listing:listings!transactions_offered_listing_id_fkey(id, title, primary_image_url, price, condition),
  buyer:profiles!transactions_buyer_id_fkey(id, first_name, last_name, username, avatar_url),
  seller:profiles!transactions_seller_id_fkey(id, first_name, last_name, username, avatar_url)
`;

// Fetches all transactions for a user split into buying and selling
export async function getMyTransactions(userId: string): Promise<{
  buying: TransactionData[];
  selling: TransactionData[];
}> {
  if (!hasEnvVars) return { buying: [], selling: [] };

  const supabase = await createClient();

  const [{ data: buying }, { data: selling }] = await Promise.all([
    supabase
      .from("transactions")
      .select(TRANSACTION_SELECT)
      .eq("buyer_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select(TRANSACTION_SELECT)
      .eq("seller_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    buying: (buying ?? []) as unknown as TransactionData[],
    selling: (selling ?? []) as unknown as TransactionData[],
  };
}

// Checks if the viewer already has a pending transaction for a listing —
// used on the listing detail page to show the right button state
export async function getExistingTransaction(
  listingId: string,
  buyerId: string,
): Promise<TransactionData | null> {
  if (!hasEnvVars) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .eq("status", "pending")
    .maybeSingle();

  return data as unknown as TransactionData | null;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export type ReviewData = {
  id: string;
  transaction_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: PublicEnum<"review_role">;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: Pick<TableRow<"profiles">, "id" | "first_name" | "last_name" | "username" | "avatar_url"> | null;
};

export type SellerRatingSummary = {
  average: number;
  count: number;
};

// All reviews where this user is the reviewee — used on their public profile
export async function getSellerReviews(revieweeId: string): Promise<ReviewData[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, transaction_id, reviewer_id, reviewee_id, reviewer_role, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, first_name, last_name, username, avatar_url)")
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as ReviewData[];
}

// Average rating + count for the profile header badge
export async function getSellerRatingSummary(revieweeId: string): Promise<SellerRatingSummary> {
  if (!hasEnvVars) return { average: 0, count: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", revieweeId);

  if (!data || data.length === 0) return { average: 0, count: 0 };

  const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return { average: Math.round(average * 10) / 10, count: data.length };
}

// Check if the viewer already left a review for a specific transaction so we
// can pre-fill the form or hide it
export async function getReviewForTransaction(
  transactionId: string,
  reviewerId: string,
): Promise<ReviewData | null> {
  if (!hasEnvVars) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, transaction_id, reviewer_id, reviewee_id, reviewer_role, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, first_name, last_name, username, avatar_url)")
    .eq("transaction_id", transactionId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();

  return data as unknown as ReviewData | null;
}

// ─── Saved listings ──────────────────────────────────────────────────────────

// Returns just the IDs — used to determine isSaved per card without fetching full data
export async function getSavedListingIds(userId: string): Promise<string[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", userId);

  return (data ?? []).map((row) => row.listing_id as string);
}

// Returns full listing data for the saved listings section on the profile page
export async function getSavedListings(userId: string): Promise<ListingCardData[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_listings")
    .select(`listing:listings!saved_listings_listing_id_fkey(${LISTING_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const listings = (data ?? [])
    .map((row) => (row as unknown as { listing: ListingCardBase | null }).listing)
    .filter((l): l is ListingCardBase => l !== null);

  return attachListingImages(supabase, listings);
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
