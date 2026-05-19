import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MyReportsPanel } from "@/components/my-reports-panel";
import { getViewerContext } from "@/lib/marketplace";

async function MyReportsContent() {
  const { user } = await getViewerContext();
  if (!user) redirect("/auth/login");

  return (
    <section className="flex flex-col gap-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">My reports</h1>
        <p className="text-sm text-muted-foreground">
          Reports you&apos;ve submitted, with their current status. Admins review every report.
        </p>
      </div>

      <MyReportsPanel />
    </section>
  );
}

function MyReportsFallback() {
  return (
    <section className="flex flex-col gap-8">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
        ))}
      </div>
    </section>
  );
}

export default function MyReportsPage() {
  return (
    <Suspense fallback={<MyReportsFallback />}>
      <MyReportsContent />
    </Suspense>
  );
}
