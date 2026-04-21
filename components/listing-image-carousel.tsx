"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState } from "react";

import type { ListingImageData } from "@/lib/marketplace";

type ListingImageCarouselProps = {
  href: string;
  images: ListingImageData[];
  primaryImageUrl: string | null;
  title: string;
};

function getImageUrls(images: ListingImageData[], primaryImageUrl: string | null) {
  const urls = images
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => image.image_url)
    .filter(Boolean);

  if (urls.length > 0) return Array.from(new Set(urls));
  return primaryImageUrl ? [primaryImageUrl] : [];
}

export function ListingImageCarousel({
  href,
  images,
  primaryImageUrl,
  title,
}: ListingImageCarouselProps) {
  const imageUrls = getImageUrls(images, primaryImageUrl);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const hasMultipleImages = imageUrls.length > 1;
  const currentImageUrl = imageUrls[currentIndex] ?? null;

  function showImageAtIndex(index: number) {
    if (index === currentIndex) return;

    setIsLoading(true);
    setCurrentIndex(index);
  }

  return (
    <div className="group/image relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-muted">
      <Link
        aria-label={`View details for ${title}`}
        href={href}
        className="block h-full w-full"
      >
        {currentImageUrl ? (
          <img
            key={currentImageUrl}
            alt={title}
            className={`h-full w-full object-cover ${isLoading ? "opacity-0" : "opacity-100"}`}
            onError={() => setIsLoading(false)}
            onLoad={() => setIsLoading(false)}
            src={currentImageUrl}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--secondary)))] px-6 text-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Acadex
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                No cover image added
              </p>
            </div>
          </div>
        )}
      </Link>

      {isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted text-sm font-medium text-muted-foreground">
          Loading...
        </div>
      ) : null}

      {hasMultipleImages && currentIndex > 0 ? (
        <button
          aria-label="Show previous listing image"
          className="absolute left-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground opacity-0 shadow-sm transition-opacity hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70 group-hover/image:opacity-100"
          disabled={isLoading}
          onClick={() => showImageAtIndex(Math.max(currentIndex - 1, 0))}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              d="m12.5 15-5-5 5-5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>
      ) : null}

      {hasMultipleImages && currentIndex < imageUrls.length - 1 ? (
        <button
          aria-label="Show next listing image"
          className="absolute right-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground opacity-0 shadow-sm transition-opacity hover:bg-background focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70 group-hover/image:opacity-100"
          disabled={isLoading}
          onClick={() => showImageAtIndex(Math.min(currentIndex + 1, imageUrls.length - 1))}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              d="m7.5 5 5 5-5 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
