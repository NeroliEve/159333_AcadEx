"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import {
  LISTING_UPDATED_TOAST_STORAGE_KEY,
  OneShotRouteToast,
} from "@/components/route-toast";
import { Card, CardContent } from "@/components/ui/card";
import { PillButton } from "@/components/ui/pill-button";
import type { ApiResponse } from "@/lib/api";
import type { ListingCardData, ViewerProfile } from "@/lib/marketplace";

type HomeDashboardData = {
  createHref: string;
  createLabel: string;
  isSignedIn: boolean;
  latestListings: ListingCardData[];
  recommendedListings: ListingCardData[];
  savedIds: string[];
  viewer: Pick<ViewerProfile, "account_status" | "id" | "role"> | null;
};

function HomeDashboardSkeleton() {
  return (
    <>
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
    </>
  );
}

function DashboardListingGrid({
  data,
  listings,
}: {
  data: HomeDashboardData;
  listings: ListingCardData[];
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
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
  );
}

function QuickAction({
  description,
  href,
  label,
}: {
  description: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border/70 bg-card p-4 text-sm transition-colors hover:bg-secondary/60"
    >
      <span className="font-semibold text-foreground">{label}</span>
      <span className="mt-1 block text-muted-foreground">{description}</span>
    </Link>
  );
}

export function HomeDashboardPanel() {
  const [data, setData] = useState<HomeDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/home", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<HomeDashboardData>;

        if (cancelled) return;

        if (!response.ok || payload.status === "error") {
          setError("Could not load dashboard. Please try again.");
          return;
        }

        setData(payload.data);
      } catch {
        if (!cancelled) {
          setError("Could not load dashboard. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  let content: ReactNode;

  if (loading && !data) {
    content = (
      <div className="space-y-3" aria-live="polite" aria-busy="true">
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          <HomeDashboardSkeleton />
        </div>
    );
  } else if (error) {
    content = (
      <EmptyState
          actionHref="/home"
          actionLabel="Refresh dashboard"
          description={error}
          eyebrow="Home"
          title="Dashboard is unavailable"
        />
    );
  } else if (!data) {
    content = (
      <EmptyState
          actionHref="/home"
          actionLabel="Refresh dashboard"
          description="Unable to load this section right now."
          eyebrow="Home"
          title="Dashboard is unavailable"
        />
    );
  } else if (!data.isSignedIn) {
    content = (
      <div className="space-y-8">
        <Card className="border-border/70 bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--secondary)))]">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-lg font-semibold">
                Sign in for recommendations and faster trading.
              </p>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                You can browse listings now, or create an account to see books matched to your university and degree.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <PillButton asChild variant="secondary">
                <Link href="/browse">Browse listings</Link>
              </PillButton>
              <PillButton asChild>
                <Link href="/auth/sign-up">Sign up</Link>
              </PillButton>
            </div>
          </CardContent>
        </Card>

        {data.latestListings.length > 0 ? (
          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">Latest books</h2>
                <p className="text-sm text-muted-foreground">
                  A quick preview of what students are listing now.
                </p>
              </div>
              <PillButton asChild variant="secondary">
                <Link href="/browse">Browse all</Link>
              </PillButton>
            </div>
            <DashboardListingGrid data={data} listings={data.latestListings} />
          </section>
        ) : null}
      </div>
    );
  } else {
    const recommendedIds = new Set(data.recommendedListings.map((listing) => listing.id));
    const latestPreview = data.latestListings.filter(
      (listing) => !recommendedIds.has(listing.id),
    );
    const visibleLatest = latestPreview.length > 0 ? latestPreview : data.latestListings;

    content = (
      <div className="space-y-10">
        <section className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Quick actions</h2>
          <p className="text-sm text-muted-foreground">
            Jump straight into the most common marketplace tasks.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <QuickAction
            href="/browse"
            label="Browse listings"
            description="Search and filter the full marketplace."
          />
          <QuickAction
            href={data.createHref}
            label={data.createLabel}
            description="Publish a book for sale or trade."
          />
          <QuickAction
            href="/messages"
            label="Messages"
            description="Continue conversations with other students."
          />
          <QuickAction
            href="/profile/saved"
            label="Saved"
            description="Review listings you saved for later."
          />
          <QuickAction
            href="/profile/transactions"
            label="Transactions"
            description="Track buying and selling history."
          />
        </div>
        </section>

        <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Recommended for you
            </h2>
            <p className="text-sm text-muted-foreground">
              Listings matched to your degree and university.
            </p>
          </div>
          <PillButton asChild variant="secondary">
            <Link href="/browse">Browse all listings</Link>
          </PillButton>
        </div>

        {data.recommendedListings.length > 0 ? (
          <DashboardListingGrid data={data} listings={data.recommendedListings} />
        ) : (
          <EmptyState
            actionHref="/browse"
            actionLabel="Browse listings"
            description="No tailored recommendations are available yet. Browse the marketplace while more students add books."
            eyebrow="Recommendations"
            title="No recommendations yet"
          />
        )}
        </section>

        <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Latest books</h2>
            <p className="text-sm text-muted-foreground">
              Recent marketplace activity beyond your recommendations.
            </p>
          </div>
          <PillButton asChild variant="secondary">
            <Link href="/browse">Browse all</Link>
          </PillButton>
        </div>

        {visibleLatest.length > 0 ? (
          <DashboardListingGrid data={data} listings={visibleLatest} />
        ) : (
          <EmptyState
            actionHref={data.createHref}
            actionLabel={data.createLabel}
            description="No books have been listed yet."
            eyebrow="Books"
            title="Marketplace is empty"
          />
        )}
        </section>
      </div>
    );
  }

  return (
    <>
      <OneShotRouteToast storageKey={LISTING_UPDATED_TOAST_STORAGE_KEY} />
      {content}
    </>
  );
}
