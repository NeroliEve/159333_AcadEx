import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ListingCard } from "@/components/listing-card";
import { getSavedListings, getViewerContext } from "@/lib/marketplace";

async function SavedListingsContent() {
  const { user, profile } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  const savedListings = await getSavedListings(user.id);

  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Saved listings</h1>
        <p className="text-sm text-muted-foreground">
          Listings you&apos;ve hearted for later.
        </p>
      </div>

      {savedListings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t saved any listings yet. Tap the heart on any listing to save it.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {savedListings.map((listing) => (
            <ListingCard
              key={listing.id}
              isSaved
              listing={listing}
              viewerAccountStatus={profile?.account_status}
              viewerId={profile?.id}
              viewerRole={profile?.role}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SavedListingsFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-64 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
          />
        ))}
      </div>
    </section>
  );
}

export default function SavedListingsPage() {
  return (
    <Suspense fallback={<SavedListingsFallback />}>
      <SavedListingsContent />
    </Suspense>
  );
}
