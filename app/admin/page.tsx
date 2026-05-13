import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminModerationPanel } from "@/components/admin-moderation-panel";
import { getAdminContext, getAdminWorkspaceData } from "@/lib/admin";
import {
  getAdminCourses,
  getUniversityOptions,
} from "@/lib/marketplace";

async function AdminContent() {
  const { isAdmin, supabase, userId } = await getAdminContext();

  if (!userId) {
    redirect("/auth/login");
  }

  if (!isAdmin) {
    redirect("/home");
  }

  const [workspace, courses, universities] = await Promise.all([
    getAdminWorkspaceData(supabase),
    getAdminCourses(),
    getUniversityOptions(true),
  ]);

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
            Oversee listings, users, verification, reports, audit history,
            and the shared catalog.
          </p>
        </div>
      </div>

      <AdminModerationPanel
        auditLogs={workspace.auditLogs}
        courses={courses}
        listings={workspace.listings}
        overview={workspace.overview}
        reports={workspace.reports}
        universities={universities}
        users={workspace.users}
      />
    </section>
  );
}

function AdminContentFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded bg-muted" />
      </div>

      <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="h-96 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminContentFallback />}>
      <AdminContent />
    </Suspense>
  );
}
