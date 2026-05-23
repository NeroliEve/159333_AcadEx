import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminModerationPanel } from "@/components/admin-moderation-panel";
import {
  getAdminAuditLogsData,
  getAdminContext,
  getAdminListingsData,
  getAdminOverviewData,
  getAdminReportsData,
  getAdminUsersData,
} from "@/lib/admin";
import { parseAdminTab, type AdminTab } from "@/lib/admin-tabs";
import {
  getAdminCourses,
  getAdminDegrees,
  getStudyAreaOptions,
  getUniversityOptions,
} from "@/lib/marketplace";

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getTabParam(params: Record<string, string | string[] | undefined>) {
  const tab = params.tab;
  return Array.isArray(tab) ? tab[0] : tab;
}

async function getInitialAdminTabData(
  tab: AdminTab,
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
) {
  switch (tab) {
    case "audit":
      return { auditLogs: await getAdminAuditLogsData(supabase) };
    case "catalog": {
      const [courses, degrees, studyAreas, universities] = await Promise.all([
        getAdminCourses(),
        getAdminDegrees(),
        getStudyAreaOptions(),
        getUniversityOptions(true),
      ]);
      return { courses, degrees, studyAreas, universities };
    }
    case "listings":
      return { listings: await getAdminListingsData(supabase) };
    case "overview":
      return getAdminOverviewData(supabase);
    case "reports":
      return { reports: await getAdminReportsData(supabase) };
    case "users":
      return { users: await getAdminUsersData(supabase) };
  }
}

async function AdminContent({ searchParams }: AdminPageProps) {
  const { isAdmin, supabase, userId } = await getAdminContext();

  if (!userId) {
    redirect("/auth/login");
  }

  if (!isAdmin) {
    redirect("/home");
  }

  const params = await searchParams;
  const initialTab = parseAdminTab(getTabParam(params));
  const initialData = await getInitialAdminTabData(initialTab, supabase);

  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin moderation
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Oversee listings, users, reports, audit history, and the shared catalog.
          </p>
        </div>
      </div>

      <AdminModerationPanel
        {...initialData}
        initialLoadedTabs={[initialTab]}
      />
    </section>
  );
}

function AdminContentFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Admin moderation
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Oversee listings, users, reports, audit history, and the shared catalog.
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
      <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="h-96 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}

export default function AdminPage({ searchParams }: AdminPageProps) {
  return (
    <Suspense fallback={<AdminContentFallback />}>
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}
