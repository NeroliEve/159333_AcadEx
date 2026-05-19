import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { getViewerAccessContext } from "@/lib/admin";
import { getSavedListings } from "@/lib/marketplace";

export async function GET() {
  try {
    const { profile, userId } = await getViewerAccessContext();

    if (!userId) {
      return NextResponse.json(apiError("You need to sign in."), { status: 401 });
    }

    const listings = await getSavedListings(userId);
    return NextResponse.json(
      apiSuccess({
        listings,
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
      apiError(error instanceof Error ? error.message : "Could not load saved listings."),
      { status: 500 },
    );
  }
}
