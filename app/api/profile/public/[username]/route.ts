import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import {
  getProfileDisplayName,
  getPublicProfile,
  getSavedListingIds,
  getSellerRatingSummary,
  getSellerReviews,
  getViewerContext,
} from "@/lib/marketplace";
import { getBlockedUserIds } from "@/lib/reports-server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params;
    const [{ profile, error }, { profile: viewer }] = await Promise.all([
      getPublicProfile(username),
      getViewerContext(),
    ]);

    if (error) {
      return NextResponse.json(apiError(error), { status: 500 });
    }

    if (!profile) {
      return NextResponse.json(apiError("Profile not found."), { status: 404 });
    }

    const isOwnProfile = viewer?.id === profile.id;
    const [ratingSummary, reviews, savedIds, blockedIds] = await Promise.all([
      getSellerRatingSummary(profile.id),
      getSellerReviews(profile.id),
      viewer ? getSavedListingIds(viewer.id) : Promise.resolve([]),
      viewer && !isOwnProfile ? getBlockedUserIds(viewer.id) : Promise.resolve([]),
    ]);

    return NextResponse.json(
      apiSuccess({
        blockedIds,
        displayName: getProfileDisplayName(profile),
        isOwnProfile,
        profile,
        ratingSummary,
        reviews,
        savedIds,
        viewer,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      apiError(error instanceof Error ? error.message : "Could not load profile."),
      { status: 500 },
    );
  }
}
