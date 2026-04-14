/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { DeleteListingButton } from "@/components/delete-listing-button";
import { ListingStatusButton } from "@/components/listing-status-button";
import {
  formatListingCondition,
  formatPrice,
  getProfileDisplayName,
  type ListingCardData,
} from "@/lib/marketplace";

type ListingCardProps = {
  listing: ListingCardData;
  viewerId?: string;
  viewerRole?: string;
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

export function ListingCard({ listing, viewerId, viewerRole }: ListingCardProps) {
  const sellerName = getProfileDisplayName(listing.seller, listing.seller?.email);

  return (
    <Card className="overflow-hidden border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg">
      <CardContent className="p-0">
        <div className="relative flex h-full flex-col">
          <Link
            aria-label={`View details for ${listing.title}`}
            className="absolute inset-0 z-0"
            href={`/listings/${listing.id}`}
          />
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

          <div className="relative z-10 flex flex-1 flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold leading-tight">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="transition-colors hover:text-[#1F5EE4]"
                  >
                    {listing.title}
                  </Link>
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
              {listing.status !== "available" ? (
                <span className={`rounded-full px-2.5 py-1 font-medium ${
                  listing.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : listing.status === "sold"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
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
              <div className="flex items-center gap-3">
                <p className="text-xs">{formatRelativeDate(listing.created_at)}</p>
                <Link
                  href={`/listings/${listing.id}`}
                  className="text-xs underline underline-offset-4 hover:text-foreground"
                >
                  View details
                </Link>
                {(viewerId === listing.seller?.id || viewerRole === "admin") && (
                  <div className="relative z-10 flex items-center gap-3">
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className="text-xs underline underline-offset-4 hover:text-foreground"
                    >
                      Edit
                    </Link>
                    <DeleteListingButton listingId={listing.id} />
                    <ListingStatusButton
                      listingId={listing.id}
                      currentStatus={listing.status}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
