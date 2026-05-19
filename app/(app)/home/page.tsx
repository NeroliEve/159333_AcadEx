import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { HomeDashboardPanel } from "@/components/home-dashboard-panel";
import { hasEnvVars } from "@/lib/utils";

function HomeDashboardFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-border/70 bg-muted/40"
          />
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
          />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  if (!hasEnvVars) {
    return (
      <EmptyState
        description="Add your Supabase URL and publishable key so the marketplace can load listings and auth can work."
        eyebrow="Acadex"
        title="Supabase setup is still missing"
      />
    );
  }

  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Home
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Your Acadex dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with recommendations, jump into common actions, or scan the latest books.
          </p>
        </div>
      </div>

      <Suspense fallback={<HomeDashboardFallback />}>
        <HomeDashboardPanel />
      </Suspense>
    </section>
  );
}
