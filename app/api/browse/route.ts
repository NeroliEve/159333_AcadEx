import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { isMarketplaceSuspended } from "@/lib/admin";
import {
  getCourseOptions,
  getListingsFeed,
  getListingsFeedFilters,
  getSavedListingIds,
  getStudyAreaOptions,
  getUniversityOptions,
  getViewerContext,
  shouldIncludeBrowseMetadata,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    if (!hasEnvVars) {
      return NextResponse.json(apiError("Supabase environment variables are missing."), {
        status: 500,
      });
    }

    const url = new URL(request.url);
    const { profile, user } = await getViewerContext();
    const filters = getListingsFeedFilters(url.searchParams);
    const metadataPromise = shouldIncludeBrowseMetadata(url.searchParams)
      ? Promise.all([
          getCourseOptions(),
          getUniversityOptions(true),
          getStudyAreaOptions(),
        ])
      : Promise.resolve([[], [], []] as const);
    const [{ listings, error }, [courses, universities, studyAreas], savedIds] =
      await Promise.all([
        getListingsFeed(user ? "authenticated" : "anonymous", filters, 24, {
          viewerId: user?.id ?? null,
        }),
        metadataPromise,
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
