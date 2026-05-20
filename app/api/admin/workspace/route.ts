import { NextResponse } from "next/server";

import { apiError, apiSuccess } from "@/lib/api";
import {
  getAdminAuditLogsData,
  getAdminContext,
  getAdminListingsData,
  getAdminOverviewData,
  getAdminReportsData,
  getAdminUsersData,
} from "@/lib/admin";
import {
  getAdminCourses,
  getAdminDegrees,
  getStudyAreaOptions,
  getUniversityOptions,
} from "@/lib/marketplace";

const adminTabs = [
  "overview",
  "users",
  "listings",
  "reports",
  "audit",
  "catalog",
] as const;

type AdminWorkspaceTab = (typeof adminTabs)[number];

function isAdminWorkspaceTab(value: string | null): value is AdminWorkspaceTab {
  return adminTabs.includes(value as AdminWorkspaceTab);
}

export async function GET(request: Request) {
  try {
    const { isAdmin, supabase, userId } = await getAdminContext();

    if (!userId) {
      return NextResponse.json(apiError("You need to sign in."), { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json(apiError("Forbidden."), { status: 403 });
    }

    const url = new URL(request.url);
    const tab = url.searchParams.get("tab");

    if (!isAdminWorkspaceTab(tab)) {
      return NextResponse.json(apiError("Unknown admin workspace tab."), { status: 400 });
    }

    switch (tab) {
      case "overview":
        return NextResponse.json(apiSuccess(await getAdminOverviewData(supabase)));
      case "users":
        return NextResponse.json(apiSuccess({ users: await getAdminUsersData(supabase) }));
      case "listings":
        return NextResponse.json(apiSuccess({ listings: await getAdminListingsData(supabase) }));
      case "reports":
        return NextResponse.json(apiSuccess({ reports: await getAdminReportsData(supabase) }));
      case "audit":
        return NextResponse.json(apiSuccess({ auditLogs: await getAdminAuditLogsData(supabase) }));
      case "catalog": {
        const [courses, degrees, studyAreas, universities] = await Promise.all([
          getAdminCourses(),
          getAdminDegrees(),
          getStudyAreaOptions(),
          getUniversityOptions(true),
        ]);
        return NextResponse.json(apiSuccess({ courses, degrees, studyAreas, universities }));
      }
    }
  } catch (error) {
    return NextResponse.json(
      apiError(error instanceof Error ? error.message : "Could not load admin workspace data."),
      { status: 500 },
    );
  }
}
