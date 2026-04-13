import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import { ProfileBanner } from "@/components/profile-banner";
import { PillButton } from "@/components/ui/pill-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getListingsFeed,
  getProfileDisplayName,
  getViewerContext,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

async function HomeContent() {
  const { profile, user } = await getViewerContext();
  const { listings, error } = await getListingsFeed(
    user ? "authenticated" : "anonymous",
  );

  const createHref = user ? "/listings/new" : "/auth/login";
  const createLabel = user ? "Create listing" : "Sign in to create";
  const displayName = getProfileDisplayName(profile, user?.email);

  return (
    <>
      {user ? (
        <ProfileBanner
          email={profile?.email ?? user.email}
          isVerified={profile?.is_verified}
          name={displayName}
          university={profile?.university}
        />
      ) : (
        <Card className="border-border/70 bg-white">
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
            description="There are no books listed yet. Be the first student to post a textbook and get the marketplace started."
            eyebrow="Books"
            title="No listings yet"
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
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
            Used books from students, ready to browse
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Find affordable second-hand textbooks or post the books you no
            longer need.
          </p>
        </div>
      </div>

      <Suspense fallback={<HomeContentFallback />}>
        <HomeContent />
      </Suspense>
    </section>
  );
}


