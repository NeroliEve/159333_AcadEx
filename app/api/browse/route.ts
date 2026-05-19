import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { isMarketplaceSuspended } from "@/lib/admin";
import {
  getCourseOptions,
  getListingsFeed,
  getSavedListingIds,
  getStudyAreaOptions,
  getUniversityOptions,
  getViewerContext,
  type ListingsFeedFilters,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

function getFilters(url: URL): ListingsFeedFilters {
  return {
    q: url.searchParams.get("q") || undefined,
    condition: url.searchParams.get("condition") || undefined,
    courseId: url.searchParams.get("courseId")
      ? Number(url.searchParams.get("courseId"))
      : undefined,
    listingType: url.searchParams.get("listingType") || undefined,
    studyAreaId: url.searchParams.get("studyAreaId")
      ? Number(url.searchParams.get("studyAreaId"))
      : undefined,
    universityId: url.searchParams.get("universityId")
      ? Number(url.searchParams.get("universityId"))
      : undefined,
    minPrice: url.searchParams.get("minPrice")
      ? Number(url.searchParams.get("minPrice"))
      : undefined,
    maxPrice: url.searchParams.get("maxPrice")
      ? Number(url.searchParams.get("maxPrice"))
      : undefined,
    sellerName: url.searchParams.get("sellerName") || undefined,
  };
}

export async function GET(request: Request) {
  try {
    if (!hasEnvVars) {
      return NextResponse.json(apiError("Supabase environment variables are missing."), {
        status: 500,
      });
    }

    const url = new URL(request.url);
    const { profile, user } = await getViewerContext();
    const filters = getFilters(url);
    const [{ listings, error }, courses, universities, studyAreas, savedIds] =
      await Promise.all([
        getListingsFeed(user ? "authenticated" : "anonymous", filters),
        getCourseOptions(),
        getUniversityOptions(true),
        getStudyAreaOptions(),
        user ? getSavedListingIds(user.id) : Promise.resolve([]),
      ]);

    if (error) {
      return NextResponse.json(apiError(error), { status: 500 });
    }

    return NextResponse.json(
      apiSuccess({
        courses,
        createHref: user
          ? isMarketplaceSuspended(profile)
            ? "/browse"
            : "/listings/new"
          : "/auth/login",
        createLabel: user
          ? isMarketplaceSuspended(profile)
            ? "Marketplace suspended"
            : "Create listing"
          : "Sign in to create",
        isSignedIn: !!user,
        listings,
        savedIds,
        studyAreas,
        universities,
        viewer: profile
          ? {
              account_status: profile.account_status,
              id: profile.id,
              role: profile.role,
            }
          : null,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      apiError(error instanceof Error ? error.message : "Could not load listings."),
      { status: 500 },
    );
  }
}
