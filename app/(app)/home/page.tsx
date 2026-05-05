import Link from "next/link";
import { Suspense } from "react";

import { isMarketplaceSuspended } from "@/lib/admin";
import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { PillButton } from "@/components/ui/pill-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCourseOptions,
  getListingsFeed,
  getSavedListingIds,
  getStudyAreaOptions,
  getUniversityOptions,
  getViewerContext,
  type ListingsFeedFilters,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

type HomeContentProps = {
  filters: ListingsFeedFilters;
};

async function HomeContent({ filters }: HomeContentProps) {
  const { profile, user } = await getViewerContext();
  const [{ listings, error }, courses, universities, studyAreas, savedIds] = await Promise.all([
    getListingsFeed(user ? "authenticated" : "anonymous", filters),
    getCourseOptions(),
    getUniversityOptions(true),
    getStudyAreaOptions(),
    user ? getSavedListingIds(user.id) : Promise.resolve([]),
  ]);

  const isSuspended = isMarketplaceSuspended(profile);
  const createHref = user ? (isSuspended ? "/home" : "/listings/new") : "/auth/login";
  const createLabel = user
    ? (isSuspended ? "Marketplace suspended" : "Create listing")
    : "Sign in to create";

  return (
    <>
      {!user && (
        <Card className="border-border/70 bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--secondary)))]">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-lg font-semibold">
                Browse first, sign in when you&apos;re ready to sell.
              </p>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                The feed is open so students can see what&apos;s available.
                You&apos;ll need an account before posting a listing.
              </p>
            </div>
            <div className="flex gap-3">
              <PillButton asChild variant="secondary">
                <Link href="/auth/login">Sign in</Link>
              </PillButton>
              <PillButton asChild>
                <Link href="/auth/sign-up">Sign up</Link>
              </PillButton>
            </div>
          </CardContent>
        </Card>
      )}

      <SearchFilterBar courses={courses} universities={universities} studyAreas={studyAreas} />

      <div className="space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Latest books
            </h2>
            <p className="text-sm text-muted-foreground">
              Current listings from the Acadex marketplace.
            </p>
          </div>

          <PillButton asChild className="sm:self-start">
            <Link href={createHref}>{createLabel}</Link>
          </PillButton>
        </div>

        {error ? (
          <EmptyState
            actionHref="/home"
            actionLabel="Refresh feed"
            description="Acadex could not load listings right now. This is usually a temporary data or permissions issue."
            eyebrow="Books"
            title="Listings are unavailable"
          />
        ) : listings.length === 0 ? (
          <EmptyState
            actionHref={createHref}
            actionLabel={createLabel}
            description="No listings match your search. Try adjusting your filters."
            eyebrow="Books"
            title="No results found"
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                viewerAccountStatus={profile?.account_status}
                viewerId={profile?.id}
                viewerRole={profile?.role}
                isSaved={savedIds.includes(listing.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function HomeContentFallback() {
  return (
    <>
      <div className="h-40 animate-pulse rounded-2xl border border-border/70 bg-muted/50" />
      <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/50" />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-7 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-border/70"
            >
              <div className="aspect-[4/3] animate-pulse bg-muted/60" />
              <div className="space-y-3 p-5">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

type HomePageProps = {
  searchParams: Promise<Record<string, string>>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
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

  const filters: ListingsFeedFilters = {
    q: params.q || undefined,
    condition: params.condition || undefined,
    courseId: params.courseId ? Number(params.courseId) : undefined,
    listingType: params.listingType || undefined,
    studyAreaId: params.studyAreaId ? Number(params.studyAreaId) : undefined,
    universityId: params.universityId ? Number(params.universityId) : undefined,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
  };

  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Home
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Used books from students, ready to browse
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Find affordable second-hand textbooks or post the books you no
            longer need.
          </p>
        </div>
      </div>

      <Suspense fallback={<HomeContentFallback />}>
        <HomeContent filters={filters} />
      </Suspense>
    </section>
  );
}
