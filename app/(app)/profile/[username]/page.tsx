import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

import { BlockUserButton } from "@/components/block-user-button";
import { ListingCard } from "@/components/listing-card";
import { EmptyState } from "@/components/empty-state";
import { ReportButton } from "@/components/report-button";
import { StarRating } from "@/components/star-rating";
import { getBlockedUserIds } from "@/lib/reports-server";
import { PillButton } from "@/components/ui/pill-button";
import { ReviewsList } from "@/components/reviews-list";
import {
  getPublicProfile,
  getProfileDisplayName,
  getSellerRatingSummary,
  getSellerReviews,
  getSavedListingIds,
  getViewerContext,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

type Props = {
  params: Promise<{ username: string }>;
};

async function ProfileContent({ params }: Props) {
  const { username } = await params;
  const { profile: viewer } = await getViewerContext();
  const { blockedMe, profile, error } = await getPublicProfile(username, {
    bypassBlock: viewer?.role === "admin",
    viewerId: viewer?.id,
  });

  const [ratingSummary, reviews, savedIds] = profile
    ? await Promise.all([
        getSellerRatingSummary(profile.id),
        getSellerReviews(profile.id, viewer?.id),
        viewer ? getSavedListingIds(viewer.id) : Promise.resolve([]),
      ])
    : [null, [], []];


  if (error) {
    return (
      <EmptyState
        eyebrow="Profile"
        title="Could not load profile"
        description="There was a problem loading this profile. Please try again later."
        actionHref="/home"
        actionLabel="Back to home"
      />
    );
  }

  if (blockedMe) {
    return (
      <EmptyState
        eyebrow="Profile"
        title="Profile unavailable"
        description="This profile is not available to view."
        actionHref="/home"
        actionLabel="Back to home"
      />
    );
  }

  if (!profile) notFound();

  const displayName = getProfileDisplayName(profile, undefined);
  const isOwnProfile = viewer?.id === profile.id;
  const blockedIds = viewer && !isOwnProfile ? await getBlockedUserIds(viewer.id) : [];
  const isBlocked = blockedIds.includes(profile.id);

  return (
    <section className="flex flex-col gap-10">
      {isOwnProfile ? (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Manage your account</h2>
            <p className="text-sm text-muted-foreground">
              Edit your public details or open your private profile pages.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <PillButton asChild size="sm">
              <Link href="/profile/edit">Edit profile</Link>
            </PillButton>
            <PillButton asChild size="sm" variant="secondary">
              <Link href="/profile/saved">Saved listings</Link>
            </PillButton>
            <PillButton asChild size="sm" variant="secondary">
              <Link href="/profile/transactions">Transaction history</Link>
            </PillButton>
            <PillButton asChild size="sm" variant="secondary">
              <Link href="/profile/reports">My reports</Link>
            </PillButton>
            <PillButton asChild size="sm" variant="secondary">
              <Link href="/profile/blocked">Blocked users</Link>
            </PillButton>
          </div>
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Seller profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">@{username}</h1>
      </div>

      {/* Profile header card */}
      <div className="rounded-2xl border border-border/70 bg-card p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`${displayName}'s profile picture`}
                  className="h-full w-full object-cover"
                  src={profile.avatar_url}
                />
              ) : (
                <span className="text-2xl font-semibold text-muted-foreground">
                  {displayName.charAt(0)}
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">{displayName}</h1>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.university ? (
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                    {profile.university}
                  </span>
                ) : null}
                <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                  {profile.is_verified ? "Verified student" : "Student seller"}
                </span>
              </div>

              {ratingSummary && ratingSummary.count > 0 ? (
                <div className="flex items-center gap-2">
                  <StarRating rating={ratingSummary.average} size="sm" />
                  <span className="text-sm text-muted-foreground">
                    {ratingSummary.average} · {ratingSummary.count} review{ratingSummary.count !== 1 ? "s" : ""}
                  </span>
                </div>
              ) : null}

              {profile.bio ? (
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  {profile.bio}
                </p>
              ) : null}

              {viewer && !isOwnProfile ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <ReportButton targetKind="user" targetId={profile.id} label="Report this user" />
                  <BlockUserButton userId={profile.id} initiallyBlocked={isBlocked} />
                </div>
              ) : null}
            </div>
          </div>

        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && <ReviewsList reviews={reviews} />}

      {/* Active listings */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Active listings</h2>
          <p className="text-sm text-muted-foreground">
            Books currently listed by {displayName}.
          </p>
        </div>

        {profile.listings.length === 0 ? (
          <EmptyState
            eyebrow="Listings"
            title="No active listings"
            description={`${displayName} doesn't have any active listings right now.`}
            actionHref="/home"
            actionLabel="Browse all listings"
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {profile.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                viewerAccountStatus={viewer?.account_status}
                viewerId={viewer?.id}
                viewerRole={viewer?.role}
                isSaved={(savedIds as string[]).includes(listing.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProfileFallback() {
  return (
    <div className="space-y-10">
      <div className="h-48 animate-pulse rounded-2xl border border-border/70 bg-muted/50" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border/70">
            <div className="aspect-[4/3] animate-pulse bg-muted/60" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicProfilePage({ params }: Props) {
  if (!hasEnvVars) {
    return (
      <EmptyState
        eyebrow="Acadex"
        title="Supabase setup is still missing"
        description="Add your Supabase URL and publishable key so the marketplace can load."
      />
    );
  }

  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}
