import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import { getViewerAccessContext } from "@/lib/admin";
import { getMyReports } from "@/lib/reports-server";

export async function GET() {
  try {
    const { userId } = await getViewerAccessContext();

    if (!userId) {
      return NextResponse.json(apiError("You need to sign in."), { status: 401 });
    }

    return NextResponse.json(apiSuccess({ reports: await getMyReports(userId) }));
  } catch (error) {
    return NextResponse.json(
      apiError(error instanceof Error ? error.message : "Could not load reports."),
      { status: 500 },
    );
  }
}
