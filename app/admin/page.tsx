import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AdminModerationPanel } from "@/components/admin-moderation-panel";
import { getAdminContext } from "@/lib/admin";

async function AdminContent() {
  const { isAdmin, userId } = await getAdminContext();

  if (!userId) {
    redirect("/auth/login");
  }

  if (!isAdmin) {
    redirect("/home");
  }

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

      <AdminModerationPanel />
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

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminContentFallback />}>
      <AdminContent />
    </Suspense>
  );
}
