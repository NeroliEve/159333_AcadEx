"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { ListingCard } from "@/components/listing-card";
import type { ApiResponse } from "@/lib/api";
import type { ListingCardData, ViewerProfile } from "@/lib/marketplace";

type SavedListingsData = {
  listings: ListingCardData[];
  viewer: Pick<ViewerProfile, "account_status" | "id" | "role"> | null;
};

function SavedListingsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
        />
      ))}
    </div>
  );
}

export function SavedListingsPanel() {
  const [data, setData] = useState<SavedListingsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedListings() {
      try {
        const response = await fetch("/api/profile/saved", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<SavedListingsData>;

        if (cancelled) return;

        if (!response.ok || payload.status === "error") {
          setError("Could not load saved listings. Please try again.");
          return;
        }

        setData(payload.data);
      } catch {
        if (!cancelled) {
          setError("Could not load saved listings. Please try again.");
        }
      }
    }

    void loadSavedListings();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <EmptyState
        actionHref="/profile/saved"
        actionLabel="Refresh saved listings"
        description={error}
        eyebrow="Saved"
        title="Saved listings are unavailable"
      />
    );
  }

  if (!data) {
    return (
      <div className="space-y-3" aria-live="polite" aria-busy="true">
        <p className="text-sm text-muted-foreground">Loading saved listings...</p>
        <SavedListingsSkeleton />
      </div>
    );
  }

  if (data.listings.length === 0) {
    return (
      <EmptyState
        actionHref="/browse"
        actionLabel="Browse listings"
        description="Tap the heart on any listing to save it for later."
        eyebrow="Saved"
        title="No saved items yet"
      />
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {data.listings.map((listing) => (
        <ListingCard
          key={listing.id}
          isSaved
          listing={listing}
          viewerAccountStatus={data.viewer?.account_status}
          viewerId={data.viewer?.id}
          viewerRole={data.viewer?.role}
        />
      ))}
    </div>
  );
}
