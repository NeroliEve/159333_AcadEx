"use client";

import { useEffect, useState } from "react";

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
          setError(
            payload.status === "error"
              ? payload.message
              : "Could not load saved listings.",
          );
          return;
        }

        setData(payload.data);
      } catch {
        if (!cancelled) {
          setError("Could not reach the saved listings endpoint.");
        }
      }
    }

    void loadSavedListings();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!data) {
    return <SavedListingsSkeleton />;
  }

  if (data.listings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven&apos;t saved any listings yet. Tap the heart on any listing to save it.
      </p>
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
