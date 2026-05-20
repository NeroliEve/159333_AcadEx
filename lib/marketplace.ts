import type { User } from "@supabase/supabase-js";
import { cache } from "react";

import { hasEnvVars } from "@/lib/utils";
import { getBlockedCounterpartyIds, getBlockRelationship, isBlockedBetween } from "@/lib/blocks";
import { createClient } from "@/lib/supabase/server";
import type {
  PublicEnum,
  TableInsert,
  TableRow,
} from "@/lib/supabase/database.types";
import {
  getBuyRequestAttemptState,
  type ExchangeTransactionStatus,
} from "@/lib/exchange-flow";
import { isMissingSellerUniversityColumnError } from "@/lib/listing-visibility";
import { getRecommendedListingsForProfile } from "@/lib/recommendations";

// ─── Shared types ────────────────────────────────────────────────────────────

type ProfileSummary = Pick<
  TableRow<"profiles">,
  | "account_status"
  | "avatar_url"
  | "bio"
  | "degree_id"
  | "id"
  | "email"
  | "first_name"
  | "last_name"
  | "role"
  | "suspended_at"
  | "transactions_seen_at"
  | "university"
  | "university_id"
  | "username"
  | "year_level"
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

type DegreeSummary = Pick<
  TableRow<"degrees">,
  "id" | "is_active" | "name" | "slug" | "study_area_id"
> & {
  study_area: StudyAreaSummary | null;
};

export type ListingImageData = Pick<
  TableRow<"listing_images">,
  "id" | "image_url" | "is_primary" | "sort_order"
>;

type ListingImageRow = ListingImageData & Pick<TableRow<"listing_images">, "listing_id">;

type ListingCardBase = Pick<
  TableRow<"listings">,
  | "archived_at"
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
  show_seller_university?: boolean | null;
  study_area: StudyAreaSummary | null;
};

type ListingCardRow = ListingCardBase & {
  seller_id?: string | null;
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
export type DegreeOption = DegreeSummary;
export type ListingCondition = PublicEnum<"listing_condition">;
export type ListingType = PublicEnum<"listing_type">;
export type ListingInsert = TableInsert<"listings">;
export type AdminCourse = CourseSummary;
export type AdminDegree = DegreeSummary;

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
  archived_at,
  primary_image_url,
  seller_id,
  show_seller_university,
  created_at,
  course:courses!listings_course_id_fkey(id, course_code, course_name, university, university_id),
  seller:profiles!listings_seller_id_fkey(id, avatar_url, degree_id, first_name, last_name, university, university_id, username, year_level),
  study_area:study_areas!listings_study_area_id_fkey(id, name, slug)
`;

const LISTING_CARD_SELECT_LEGACY = LISTING_CARD_SELECT.replace(
  "  show_seller_university,\n",
  "",
);

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
  archived_at,
  primary_image_url,
  seller_id,
  show_seller_university,
  created_at,
  course:courses!listings_course_id_fkey(id, course_code, course_name, university, university_id),
  study_area:study_areas!listings_study_area_id_fkey(id, name, slug)
`;

const LISTING_CARD_SELECT_ANON_LEGACY = LISTING_CARD_SELECT_ANON.replace(
  "  show_seller_university,\n",
  "",
);

function getListingCardSelect(audience: ListingsFeedAudience, includeVisibility = true) {
  if (audience === "authenticated") {
    return includeVisibility ? LISTING_CARD_SELECT : LISTING_CARD_SELECT_LEGACY;
  }

  return includeVisibility ? LISTING_CARD_SELECT_ANON : LISTING_CARD_SELECT_ANON_LEGACY;
}

function getListingDetailSelect(includeVisibility = true) {
  const cardSelect = includeVisibility ? LISTING_CARD_SELECT : LISTING_CARD_SELECT_LEGACY;
  return `${cardSelect}, seller_id, course_id, isbn, publisher, study_area_id, wanted_trade_text`;
}

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

function stripListingInternalFields(listings: ListingCardRow[]): ListingCardBase[] {
  return listings.map(({ seller_id: _sellerId, ...listing }) => {
    void _sellerId;
    return listing;
  });
}

async function loadViewerContext(): Promise<{
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
      "account_status, avatar_url, bio, degree_id, id, email, first_name, last_name, role, suspended_at, transactions_seen_at, university, university_id, username, year_level",
    )
    .eq("id", user.id)
    .maybeSingle();

  return { profile, user };
}

export const getViewerContext = cache(loadViewerContext);

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

type BrowseSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export type BrowseListingsData = {
  courses: CourseOption[];
  createHref: string;
  createLabel: string;
  isSignedIn: boolean;
  listings: ListingCardData[];
  savedIds: string[];
  studyAreas: StudyAreaOption[];
  universities: UniversityOption[];
  viewer: Pick<ViewerProfile, "account_status" | "id" | "role"> | null;
};

type ListingsFeedAudience = "anonymous" | "authenticated";

type ListingsFeedOptions = {
  viewerId?: string | null;
};

function getBrowseSearchParam(
  searchParams: BrowseSearchParams,
  key: string,
): string | null {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(key);
  }

  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getBrowseNumberSearchParam(
  searchParams: BrowseSearchParams,
  key: string,
): number | undefined {
  const value = getBrowseSearchParam(searchParams, key);
  return value ? Number(value) : undefined;
}

export function getListingsFeedFilters(
  searchParams: BrowseSearchParams,
): ListingsFeedFilters {
  return {
    q: getBrowseSearchParam(searchParams, "q") || undefined,
    condition: getBrowseSearchParam(searchParams, "condition") || undefined,
    courseId: getBrowseNumberSearchParam(searchParams, "courseId"),
    listingType: getBrowseSearchParam(searchParams, "listingType") || undefined,
    studyAreaId: getBrowseNumberSearchParam(searchParams, "studyAreaId"),
    universityId: getBrowseNumberSearchParam(searchParams, "universityId"),
    minPrice: getBrowseNumberSearchParam(searchParams, "minPrice"),
    maxPrice: getBrowseNumberSearchParam(searchParams, "maxPrice"),
    sellerName: getBrowseSearchParam(searchParams, "sellerName") || undefined,
  };
}

export function shouldIncludeBrowseMetadata(searchParams: BrowseSearchParams) {
  return getBrowseSearchParam(searchParams, "_metadata") !== "0";
}

export async function getListingsFeed(
  audience: ListingsFeedAudience,
  filters: ListingsFeedFilters = {},
  limit = 24,
  options: ListingsFeedOptions = {},
): Promise<{
  error: string | null;
  listings: ListingCardData[];
}> {
  if (!hasEnvVars) {
    return { error: "Supabase environment variables are missing.", listings: [] };
  }

  const supabase = await createClient();
  let viewerId = options.viewerId;

  if (viewerId === undefined) {
    const { data: { user } } = await supabase.auth.getUser();
    viewerId = user?.id ?? null;
  }

  const blockedIds = viewerId ? await getBlockedCounterpartyIds(viewerId) : [];

  async function runListingsQuery(includeVisibility = true) {
    let query = supabase
      .from("listings")
      .select(getListingCardSelect(audience, includeVisibility))
      .in("status", ["available", "pending"])
      .is("deleted_at", null)
      .is("archived_at", null);

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

      if (orParts.length === 0) return { data: [], error: null };

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
      if (sellerIds.length === 0) return { data: [], error: null };

      query = query.in("seller_id", sellerIds);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte("price", filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte("price", filters.maxPrice);
    }

    return query
      .order("created_at", { ascending: false })
      .limit(limit);
  }

  let result = await runListingsQuery();
  let data: unknown = result.data;
  let error = result.error;

  if (isMissingSellerUniversityColumnError(error)) {
    result = await runListingsQuery(false);
    data = result.data;
    error = result.error;
  }

  if (error) return { error: error.message, listings: [] };

  const visibleRows = ((data ?? []) as ListingCardRow[]).filter(
    (listing) => !blockedIds.includes(listing.seller_id ?? ""),
  );

  return {
    error: null,
    listings: await attachListingImages(supabase, stripListingInternalFields(visibleRows)),
  };
}

// ─── Individual listing queries ───────────────────────────────────────────────

export async function getRecommendedListings(
  profile: ViewerProfile | null,
  limit = 6,
): Promise<{
  error: string | null;
  listings: ListingCardData[];
}> {
  if (!profile?.id || !profile.degree_id || !profile.university_id) {
    return { error: null, listings: [] };
  }

  const supabase = await createClient();
  const { data: degree, error: degreeError } = await supabase
    .from("degrees")
    .select("study_area_id")
    .eq("id", profile.degree_id)
    .maybeSingle();

  if (degreeError) {
    return { error: degreeError.message, listings: [] };
  }

  if (!degree?.study_area_id) {
    return { error: null, listings: [] };
  }

  const { error, listings } = await getListingsFeed(
    "authenticated",
    {},
    Math.max(48, limit * 8),
    { viewerId: profile.id },
  );

  if (error) {
    return { error, listings: [] };
  }

  return {
    error: null,
    listings: getRecommendedListingsForProfile({
      limit,
      listings,
      profile: {
        degreeStudyAreaId: degree.study_area_id,
        id: profile.id,
        universityId: profile.university_id,
      },
    }),
  };
}

export async function getMyListings(userId: string): Promise<ListingCardData[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const result = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("seller_id", userId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  let data: unknown = result.data;
  const { error } = result;

  if (isMissingSellerUniversityColumnError(error)) {
    const legacyResult = await supabase
      .from("listings")
      .select(LISTING_CARD_SELECT_LEGACY)
      .eq("seller_id", userId)
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    data = legacyResult.data;
  }

  return attachListingImages(supabase, stripListingInternalFields((data ?? []) as ListingCardRow[]));
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
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as Array<{
    id: string;
    title: string;
    primary_image_url: string | null;
    price: number | null;
    listing_type: ListingType;
  }>;
}

export async function getListingById(id: string, options: {
  bypassBlock?: boolean;
  viewerId?: string | null;
} = {}): Promise<{
  listing: ListingDetailData | null;
  error: string | null;
}> {
  if (!hasEnvVars) {
    return { listing: null, error: "Supabase environment variables are missing." };
  }

  const supabase = await createClient();
  let result = await supabase
    .from("listings")
    .select(getListingDetailSelect())
    .eq("id", id)
    .maybeSingle();
  let data: unknown = result.data;
  let error = result.error;

  if (isMissingSellerUniversityColumnError(error)) {
    result = await supabase
      .from("listings")
      .select(getListingDetailSelect(false))
      .eq("id", id)
      .maybeSingle();
    data = result.data;
    error = result.error;
  }

  if (error) return { listing: null, error: error.message };
  if (!data) return { listing: null, error: null };

  const listingData = data as Omit<ListingDetailData, "images">;
  if (
    options.viewerId &&
    !options.bypassBlock &&
    options.viewerId !== listingData.seller_id &&
    await isBlockedBetween(options.viewerId, listingData.seller_id)
  ) {
    return { listing: null, error: null };
  }

  const { data: images, error: imagesError } = await supabase
    .from("listing_images")
    .select("id, image_url, is_primary, sort_order")
    .eq("listing_id", id)
    .order("sort_order", { ascending: true });

  if (imagesError) return { listing: null, error: imagesError.message };

  return {
    listing: {
      ...listingData,
      images: (images ?? []) as ListingImageData[],
    },
    error: null,
  };
}

// ─── Public profile ───────────────────────────────────────────────────────────

export async function getListingTransactionParticipantIds(listingId: string): Promise<string[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("buyer_id, seller_id")
    .or(`listing_id.eq.${listingId},offered_listing_id.eq.${listingId}`);

  const participantIds = new Set<string>();
  for (const transaction of data ?? []) {
    participantIds.add(transaction.buyer_id);
    participantIds.add(transaction.seller_id);
  }

  return [...participantIds];
}

export async function getPublicProfile(username: string, options: {
  bypassBlock?: boolean;
  viewerId?: string | null;
} = {}): Promise<{
  blockedByMe?: boolean;
  blockedMe?: boolean;
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
      "account_status, avatar_url, bio, degree_id, id, email, first_name, last_name, role, suspended_at, transactions_seen_at, university, university_id, username, year_level",
    )
    .eq("username", username)
    .maybeSingle();

  if (profileError) return { profile: null, error: profileError.message };
  if (!profileData) return { profile: null, error: null };

  let blockedByMe = false;
  let blockedMe = false;
  if (
    options.viewerId &&
    !options.bypassBlock &&
    options.viewerId !== profileData.id
  ) {
    const relationship = await getBlockRelationship(options.viewerId, profileData.id);
    blockedByMe = relationship.blockedByMe;
    blockedMe = relationship.blockedMe;
    if (blockedMe) {
      return { blockedByMe, blockedMe, profile: null, error: null };
    }
  }

  const listingsResult = await supabase
    .from("listings")
    .select(LISTING_CARD_SELECT)
    .eq("seller_id", profileData.id)
    .in("status", ["available", "pending"])
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: false });
  let listingsData: unknown = listingsResult.data;
  const { error: listingsError } = listingsResult;

  if (isMissingSellerUniversityColumnError(listingsError)) {
    const legacyListingsResult = await supabase
      .from("listings")
      .select(LISTING_CARD_SELECT_LEGACY)
      .eq("seller_id", profileData.id)
      .in("status", ["available", "pending"])
      .is("deleted_at", null)
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    listingsData = legacyListingsResult.data;
  }

  const listings = await attachListingImages(
    supabase,
    stripListingInternalFields((listingsData ?? []) as ListingCardRow[]),
  );

  return {
    blockedByMe,
    blockedMe,
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

export async function getDegreeOptions(
  includeInactive = false,
  limit = 100,
): Promise<DegreeOption[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  let query = supabase
    .from("degrees")
    .select("id, is_active, name, slug, study_area_id, study_area:study_areas!degrees_study_area_id_fkey(id, name, slug)")
    .order("name", { ascending: true })
    .limit(limit);

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data } = await query;
  return (data ?? []) as unknown as DegreeOption[];
}

export async function getAdminDegrees(): Promise<AdminDegree[]> {
  return getDegreeOptions(true, 200);
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
  request_type: PublicEnum<"transaction_request_type">;
  payment_status: PublicEnum<"transaction_payment_status">;
  seller_confirmed_completed: boolean;
  reservation_confirmed_at: string | null;
  paid_at: string | null;
  payment_requested_at: string | null;
  payment_requested_by: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  declined_at: string | null;
  request_message: string | null;
  created_at: string;
  updated_at: string;
  listing: Pick<TableRow<"listings">, "id" | "title" | "primary_image_url" | "price" | "condition"> | null;
  offered_listing: Pick<TableRow<"listings">, "id" | "title" | "primary_image_url" | "price" | "condition"> | null;
  buyer: Pick<TableRow<"profiles">, "id" | "first_name" | "last_name" | "username" | "avatar_url"> | null;
  counterparty_blocked?: boolean;
  seller: Pick<TableRow<"profiles">, "id" | "first_name" | "last_name" | "username" | "avatar_url"> | null;
};

const TRANSACTION_SELECT = `
  id, listing_id, offered_listing_id, conversation_id, buyer_id, seller_id, agreed_price, agreed_trade_text,
  status, request_type, payment_status, seller_confirmed_completed, reservation_confirmed_at, paid_at,
  payment_requested_at, payment_requested_by,
  completed_at, cancelled_at, declined_at, request_message, created_at, updated_at,
  listing:listings!transactions_listing_id_fkey(id, title, primary_image_url, price, condition),
  offered_listing:listings!transactions_offered_listing_id_fkey(id, title, primary_image_url, price, condition),
  buyer:profiles!transactions_buyer_id_fkey(id, first_name, last_name, username, avatar_url),
  seller:profiles!transactions_seller_id_fkey(id, first_name, last_name, username, avatar_url)
`;

function isTransactionHistoryEntry(tx: TransactionData) {
  return tx.status === "completed" || (tx.status === "cancelled" && !!tx.reservation_confirmed_at);
}

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

  const blockedCounterparties = new Set(await getBlockedCounterpartyIds(userId));
  const sanitizeTransaction = (tx: TransactionData): TransactionData => {
    const otherId = tx.seller_id === userId ? tx.buyer_id : tx.seller_id;
    if (!blockedCounterparties.has(otherId)) {
      return { ...tx, counterparty_blocked: false };
    }

    return {
      ...tx,
      buyer: tx.buyer_id === otherId ? null : tx.buyer,
      counterparty_blocked: true,
      listing: tx.seller_id === otherId ? null : tx.listing,
      offered_listing: tx.buyer_id === otherId ? null : tx.offered_listing,
      seller: tx.seller_id === otherId ? null : tx.seller,
    };
  };

  return {
    buying: ((buying ?? []) as unknown as TransactionData[]).filter(isTransactionHistoryEntry).map(sanitizeTransaction),
    selling: ((selling ?? []) as unknown as TransactionData[]).filter(isTransactionHistoryEntry).map(sanitizeTransaction),
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

export type ListingRequestState = {
  pendingTransaction: TransactionData | null;
  latestDeclinedTransaction: TransactionData | null;
  declinedBuyCount: number;
  canRequestToBuy: boolean;
  remainingBuyAttempts: number;
  buyStatusMessage: string | null;
  conversationId: string | null;
};

export function shouldShowListingRequestActions({
  hasViewerPendingTransaction,
  listingStatus,
}: {
  hasViewerPendingTransaction: boolean;
  listingStatus: PublicEnum<"listing_status">;
}) {
  return listingStatus === "available" || hasViewerPendingTransaction;
}

export async function getListingRequestState(
  listingId: string,
  buyerId: string,
): Promise<ListingRequestState> {
  if (!hasEnvVars) {
    const attemptState = getBuyRequestAttemptState({
      declinedCount: 0,
      hasPendingRequest: false,
    });

    return {
      pendingTransaction: null,
      latestDeclinedTransaction: null,
      declinedBuyCount: 0,
      canRequestToBuy: attemptState.canRequest,
      remainingBuyAttempts: attemptState.remainingAttempts,
      buyStatusMessage: attemptState.statusMessage,
      conversationId: null,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .in("status", ["pending", "declined"] as ExchangeTransactionStatus[])
    .order("created_at", { ascending: false });

  const transactions = (data ?? []) as unknown as TransactionData[];
  const pendingTransaction = transactions.find((tx) => tx.status === "pending") ?? null;
  const declinedBuyTransactions = transactions.filter(
    (tx) => tx.status === "declined" && tx.request_type === "buy",
  );
  const latestDeclinedTransaction = declinedBuyTransactions[0] ?? null;
  const attemptState = getBuyRequestAttemptState({
    declinedCount: declinedBuyTransactions.length,
    hasPendingRequest: !!pendingTransaction,
  });

  return {
    pendingTransaction,
    latestDeclinedTransaction,
    declinedBuyCount: declinedBuyTransactions.length,
    canRequestToBuy: attemptState.canRequest,
    remainingBuyAttempts: attemptState.remainingAttempts,
    buyStatusMessage: attemptState.statusMessage,
    conversationId:
      pendingTransaction?.conversation_id ??
      latestDeclinedTransaction?.conversation_id ??
      null,
  };
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
export async function getSellerReviews(revieweeId: string, viewerId?: string | null): Promise<ReviewData[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, transaction_id, reviewer_id, reviewee_id, reviewer_role, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(id, first_name, last_name, username, avatar_url)")
    .eq("reviewee_id", revieweeId)
    .order("created_at", { ascending: false });

  const reviews = (data ?? []) as unknown as ReviewData[];
  if (!viewerId) return reviews;

  const blockedCounterparties = new Set(await getBlockedCounterpartyIds(viewerId));
  return reviews.map((review) =>
    blockedCounterparties.has(review.reviewer_id)
      ? { ...review, reviewer: null }
      : review,
  );
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
  const result = await supabase
    .from("saved_listings")
    .select(`listing:listings!saved_listings_listing_id_fkey(${LISTING_CARD_SELECT})`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  let data: unknown = result.data;
  const { error } = result;

  if (isMissingSellerUniversityColumnError(error)) {
    const legacyResult = await supabase
      .from("saved_listings")
      .select(`listing:listings!saved_listings_listing_id_fkey(${LISTING_CARD_SELECT_LEGACY})`)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    data = legacyResult.data;
  }

  const listings = ((data ?? []) as unknown[])
    .map((row) => (row as unknown as { listing: ListingCardRow | null }).listing)
    .filter((l): l is ListingCardRow => l !== null)
    .filter((listing) => listing.status !== "archived" && !listing.archived_at);

  const blockedCounterparties = new Set(await getBlockedCounterpartyIds(userId));
  return attachListingImages(
    supabase,
    stripListingInternalFields(
      listings.filter((listing) => !blockedCounterparties.has(listing.seller_id ?? "")),
    ),
  );
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
