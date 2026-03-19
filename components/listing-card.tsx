/* eslint-disable @next/next/no-img-element */

import { Card, CardContent } from "@/components/ui/card";
import {
  formatListingCondition,
  formatPrice,
  getProfileDisplayName,
  type ListingCardData,
} from "@/lib/marketplace";

type ListingCardProps = {
  listing: ListingCardData;
};

function formatRelativeDate(dateString: string) {
  const diffInHours = Math.round(
    (new Date(dateString).getTime() - Date.now()) / (1000 * 60 * 60),
  );

  if (Math.abs(diffInHours) < 24) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      diffInHours,
      "hour",
    );
  }

  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    Math.round(diffInHours / 24),
    "day",
  );
}

export function ListingCard({ listing }: ListingCardProps) {
  const sellerName = getProfileDisplayName(listing.seller, listing.seller?.email);

  return (
    <Card className="overflow-hidden border-border/70">
      <CardContent className="p-0">
        <div className="flex h-full flex-col">
          <div className="aspect-[4/3] w-full bg-muted">
            {listing.primary_image_url ? (
              <img
                alt={listing.title}
                className="h-full w-full object-cover"
                src={listing.primary_image_url}
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
          </div>

          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold leading-tight">
                  {listing.title}
                </h3>
                {listing.author ? (
                  <p className="text-sm text-muted-foreground">
                    by {listing.author}
                  </p>
                ) : null}
              </div>
              <p className="whitespace-nowrap text-base font-semibold">
                {formatPrice(listing.price)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                {formatListingCondition(listing.condition)}
              </span>
              {listing.course?.course_code ? (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {listing.course.course_code}
                </span>
              ) : null}
              {listing.seller?.university ? (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {listing.seller.university}
                </span>
              ) : null}
            </div>

            {listing.description ? (
              <p className="text-sm text-muted-foreground">
                {listing.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No additional description provided.
              </p>
            )}

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground">
              <div>
                <p>{sellerName}</p>
                <p className="text-xs">
                  {listing.seller?.is_verified
                    ? "Verified student"
                    : "Student seller"}
                </p>
              </div>
              <p className="text-xs">{formatRelativeDate(listing.created_at)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
