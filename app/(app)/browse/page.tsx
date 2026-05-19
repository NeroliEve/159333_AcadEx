import { Suspense } from "react";

import { AiSearchBar } from "@/components/ai-search-bar";
import { BrowseListingsPanel } from "@/components/browse-listings-panel";
import { EmptyState } from "@/components/empty-state";
import { isMarketplaceSuspended } from "@/lib/admin";
import {
  getCourseOptions,
  getListingsFeed,
  getListingsFeedFilters,
  getSavedListingIds,
  getStudyAreaOptions,
  getUniversityOptions,
  getViewerContext,
  type BrowseListingsData,
} from "@/lib/marketplace";
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getFirstSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function toUrlSearchParams(params: Record<string, string | string[] | undefined>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => searchParams.append(key, entry));
    } else if (value !== undefined) {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

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
  const aiExplanation = getFirstSearchParam(params, "_ai") || undefined;
  const initialSearchParams = toUrlSearchParams(params);
  const { profile, user } = await getViewerContext();
  const filters = getListingsFeedFilters(initialSearchParams);
  const [{ listings, error }, courses, universities, studyAreas, savedIds] =
    await Promise.all([
      getListingsFeed(user ? "authenticated" : "anonymous", filters, 24, {
        viewerId: user?.id ?? null,
      }),
      getCourseOptions(),
      getUniversityOptions(true),
      getStudyAreaOptions(),
      user ? getSavedListingIds(user.id) : Promise.resolve([]),
    ]);

  const initialData: BrowseListingsData = {
    courses,
    createHref: user
      ? isMarketplaceSuspended(profile)
        ? "/browse"
        : "/listings/new"
      : "/auth/login",
    createLabel: user
      ? isMarketplaceSuspended(profile)
        ? "Marketplace suspended"
        : "Create listing"
      : "Sign in to create",
    isSignedIn: !!user,
    listings,
    savedIds,
    studyAreas,
    universities,
    viewer: profile
      ? {
          account_status: profile.account_status,
          id: profile.id,
          role: profile.role,
        }
      : null,
  };

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
        <BrowseListingsPanel
          aiExplanation={aiExplanation}
          initialData={initialData}
          initialError={error}
          initialQueryString={initialSearchParams.toString()}
        />
      </Suspense>
    </section>
  );
}
