"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { SearchFilterBar } from "@/components/search-filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import type { ApiResponse } from "@/lib/api";
import type {
  CourseOption,
  ListingCardData,
  StudyAreaOption,
  UniversityOption,
  ViewerProfile,
} from "@/lib/marketplace";

type BrowseListingsData = {
  courses: CourseOption[];
  createHref: string;
  createLabel: string;
  isSignedIn: boolean;
  listings: ListingCardData[];
  savedIds: string[];
  studyAreas: StudyAreaOption[];
  universities: UniversityOption[];
  viewer: Pick<ViewerProfile, "account_status" | "id" | "role"> | null;
};

type BrowseListingsPanelProps = {
  aiExplanation?: string;
};

function BrowseListingsSkeleton() {
  return (
    <>
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

export function BrowseListingsPanel({ aiExplanation }: BrowseListingsPanelProps) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [data, setData] = useState<BrowseListingsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          queryString ? `/api/browse?${queryString}` : "/api/browse",
          { cache: "no-store" },
        );
        const payload = (await response.json()) as ApiResponse<BrowseListingsData>;

        if (cancelled) return;

        if (!response.ok || payload.status === "error") {
          setError(
            payload.status === "error" ? payload.message : "Could not load listings.",
          );
          return;
        }

        setData(payload.data);
      } catch {
        if (!cancelled) {
          setError("Could not reach the browse endpoint.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadListings();

    return () => {
      cancelled = true;
    };
  }, [queryString]);

  return (
    <>
      {data && !data.isSignedIn ? (
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
      ) : null}

      {aiExplanation ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Claude
          </span>
          <p className="text-sm text-foreground">{aiExplanation}</p>
        </div>
      ) : null}

      {data ? (
        <SearchFilterBar
          courses={data.courses}
          universities={data.universities}
          studyAreas={data.studyAreas}
        />
      ) : (
        <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/50" />
      )}

      {loading && !data ? <BrowseListingsSkeleton /> : null}

      {error ? (
        <EmptyState
          actionHref="/browse"
          actionLabel="Refresh listings"
          description={error}
          eyebrow="Books"
          title="Listings are unavailable"
        />
      ) : null}

      {data && !error ? (
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
              <Link href={data.createHref}>{data.createLabel}</Link>
            </PillButton>
          </div>

          {loading ? (
            <div className="h-2 animate-pulse rounded-full bg-muted" />
          ) : null}

          {data.listings.length === 0 ? (
            <EmptyState
              actionHref={data.createHref}
              actionLabel={data.createLabel}
              description="No listings match your search. Try adjusting your filters."
              eyebrow="Books"
              title="No results found"
            />
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {data.listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  viewerAccountStatus={data.viewer?.account_status}
                  viewerId={data.viewer?.id}
                  viewerRole={data.viewer?.role}
                  isSaved={data.savedIds.includes(listing.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
