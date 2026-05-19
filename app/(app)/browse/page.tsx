import { Suspense } from "react";

import { AiSearchBar } from "@/components/ai-search-bar";
import { BrowseListingsPanel } from "@/components/browse-listings-panel";
import { EmptyState } from "@/components/empty-state";
import { hasEnvVars } from "@/lib/utils";

function BrowseContentFallback() {
  return (
    <>
      <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/50" />
      <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/50" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-80 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
          />
        ))}
      </div>
    </>
  );
}

type BrowsePageProps = {
  searchParams: Promise<Record<string, string>>;
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  if (!hasEnvVars) {
    return (
      <EmptyState
        description="Add your Supabase URL and publishable key so the marketplace can load listings and auth can work."
        eyebrow="Acadex"
        title="Supabase setup is still missing"
      />
    );
  }

  const params = await searchParams;
  const aiExplanation = params._ai || undefined;

  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Browse
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Browse student book listings
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Search, filter, and compare current books across the Acadex marketplace.
          </p>
        </div>
      </div>

      <AiSearchBar />

      <Suspense fallback={<BrowseContentFallback />}>
        <BrowseListingsPanel aiExplanation={aiExplanation} />
      </Suspense>
    </section>
  );
}
