/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { ListingManageMenu } from "@/components/listing-manage-menu";
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

// Maps listing status to a badge colour class
function statusBadgeClass(status: string) {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800";
    case "sold":    return "bg-red-100 text-red-800";
    default:        return "bg-gray-100 text-gray-600";
  }
}

export function ListingCard({ listing, viewerId, viewerRole }: ListingCardProps) {
  const sellerName = getProfileDisplayName(listing.seller, listing.seller?.email);
  const isOwner =
    viewerRole === "admin" || (!!viewerId && viewerId === listing.seller?.id);

  return (
    <Card className="relative overflow-visible border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg">
      <CardContent className="p-0">
        <div className="flex h-full flex-col">

          {/* Clicking the image navigates to the listing — no invisible overlay needed */}
          <Link
            aria-label={`View details for ${listing.title}`}
            href={`/listings/${listing.id}`}
            className="relative block aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-muted"
          >
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
          </Link>

          {isOwner ? (
            <div className="absolute right-3 top-3 z-10">
              <ListingManageMenu
                listingId={listing.id}
                currentStatus={listing.status}
              />
            </div>
          ) : null}

          <div className="flex flex-1 flex-col gap-4 p-5">
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
                  <p className="text-sm text-muted-foreground">by {listing.author}</p>
                ) : null}
              </div>
              <p className="whitespace-nowrap text-base font-semibold">
                {formatPrice(listing.price)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
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
                <span className={`rounded-full px-2.5 py-1 font-medium ${statusBadgeClass(listing.status)}`}>
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </span>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              {listing.description ?? "No additional description provided."}
            </p>

            <p className="text-xs text-muted-foreground">
              {formatRelativeDate(listing.created_at)}
            </p>

            <div className="mt-auto flex items-center gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary">
                  {listing.seller?.avatar_url ? (
                    <img
                      alt={`${sellerName}'s profile picture`}
                      className="h-full w-full object-cover"
                      src={listing.seller.avatar_url}
                    />
                  ) : (
                    <span className="text-sm font-semibold text-muted-foreground">
                      {sellerName.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  {listing.seller?.username ? (
                    <Link
                      href={`/profile/${listing.seller.username}`}
                      className="block truncate font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                    >
                      {sellerName}
                    </Link>
                  ) : (
                    <p className="truncate font-medium">{sellerName}</p>
                  )}
                  <p className="truncate text-xs">
                    {listing.seller?.is_verified ? "Verified student" : "Student seller"}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
