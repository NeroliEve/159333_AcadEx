"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { ListingImageData } from "@/lib/marketplace";

type ListingDetailGalleryProps = {
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

export function ListingDetailGallery({
  images,
  primaryImageUrl,
  title,
}: ListingDetailGalleryProps) {
  const imageUrls = useMemo(
    () => getImageUrls(images, primaryImageUrl),
    [images, primaryImageUrl],
  );
  const [activeImageUrl, setActiveImageUrl] = useState(imageUrls[0] ?? null);

  useEffect(() => {
    setActiveImageUrl((current) => {
      if (current && imageUrls.includes(current)) {
        return current;
      }

      return imageUrls[0] ?? null;
    });
  }, [imageUrls]);

  if (!activeImageUrl) {
    return (
      <div className="aspect-[4/3] w-full bg-muted">
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
      </div>
    );
  }

  return (
    <div className="space-y-3 p-0">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <Image
          alt={title}
          className="h-full w-full object-cover"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          src={activeImageUrl}
        />
      </div>

      {imageUrls.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto px-4 pb-4 sm:px-6">
          {imageUrls.map((imageUrl, index) => {
            const isActive = imageUrl === activeImageUrl;

            return (
              <button
                key={imageUrl}
                aria-label={`Show listing image ${index + 1}`}
                className={`shrink-0 overflow-hidden rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isActive
                    ? "border-foreground"
                    : "border-border/70 hover:border-foreground/40"
                }`}
                onClick={() => setActiveImageUrl(imageUrl)}
                type="button"
              >
                <Image
                  alt={`${title} thumbnail ${index + 1}`}
                  className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                  height={96}
                  loading="lazy"
                  sizes="(min-width: 640px) 96px, 80px"
                  src={imageUrl}
                  width={96}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
