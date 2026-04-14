import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminDashboard } from "@/components/admin-dashboard";
import {
  getAdminCourses,
  getUniversityOptions,
  getViewerContext,
} from "@/lib/marketplace";

async function AdminContent() {
  const { profile, user } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  if (profile?.role !== "admin") {
    redirect("/home");
  }

  const [courses, universities] = await Promise.all([
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
            Admin dashboard
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Manage the shared university list and the global course catalog used
            throughout the marketplace.
          </p>
        </div>
      </div>

      <AdminDashboard courses={courses} universities={universities} />
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
