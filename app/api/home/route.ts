import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { isMarketplaceSuspended } from "@/lib/admin";
import {
  getListingsFeed,
  getRecommendedListings,
  getSavedListingIds,
  getViewerContext,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

export async function GET() {
  try {
    if (!hasEnvVars) {
      return NextResponse.json(apiError("Supabase environment variables are missing."), {
        status: 500,
      });
    }

    const { profile, user } = await getViewerContext();
    const [
      { listings: latestListings, error: latestError },
      { listings: recommendedListings, error: recommendationsError },
      savedIds,
    ] = await Promise.all([
      getListingsFeed(user ? "authenticated" : "anonymous", {}, 6),
      user ? getRecommendedListings(profile) : Promise.resolve({ error: null, listings: [] }),
      user ? getSavedListingIds(user.id) : Promise.resolve([]),
    ]);

    if (latestError) {
      return NextResponse.json(apiError(latestError), { status: 500 });
    }

    if (recommendationsError) {
      return NextResponse.json(apiError(recommendationsError), { status: 500 });
    }

    return NextResponse.json(
      apiSuccess({
        createHref: user
          ? isMarketplaceSuspended(profile)
            ? "/home"
            : "/listings/new"
          : "/auth/login",
        createLabel: user
          ? isMarketplaceSuspended(profile)
            ? "Marketplace suspended"
            : "List a book"
          : "Sign in to list",
        isSignedIn: !!user,
        latestListings,
        recommendedListings,
        savedIds,
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
      apiError(error instanceof Error ? error.message : "Could not load the home dashboard."),
      { status: 500 },
    );
  }
}
