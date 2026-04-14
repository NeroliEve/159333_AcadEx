import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeleteListingButton } from "@/components/delete-listing-button";
import { ListingStatusButton } from "@/components/listing-status-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatListingCondition,
  formatPrice,
  getListingById,
  getProfileDisplayName,
  getViewerContext,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasEnvVars) {
    return (
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Listing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Supabase setup is still missing
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Add your Supabase environment variables before viewing listings.
        </p>
      </section>
    );
  }

  return (
    <Suspense fallback={<ListingDetailFallback />}>
      <ListingDetailContent params={params} />
    </Suspense>
  );
}

async function ListingDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ user, profile }, { listing, error }] = await Promise.all([
    getViewerContext(),
    getListingById(id),
  ]);

  if (!user) {
    // The page is still public, but authenticated users get seller actions.
  }

  if (error || !listing) {
    notFound();
  }

  const sellerName = getProfileDisplayName(listing.seller, listing.seller?.email);
  const isOwner = user?.id === listing.seller_id;
  const isAdmin = profile?.role === "admin";
  const canManage = isOwner || isAdmin;
  const sellerEmail = listing.seller?.email;
  const contactHref = sellerEmail
    ? `mailto:${sellerEmail}?subject=${encodeURIComponent(
        `Acadex listing: ${listing.title}`,
      )}&body=${encodeURIComponent(
        `Hi ${sellerName},\n\nI'm interested in your Acadex listing "${listing.title}".\n\nThanks!`,
      )}`
    : null;

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Listing details
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {listing.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Posted by {sellerName}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-3xl font-semibold">{formatPrice(listing.price)}</p>
            <p className="text-sm text-muted-foreground">
              {formatListingCondition(listing.condition)} condition
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden border-border/70">
          <CardContent className="p-0">
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

            <div className="space-y-6 p-6">
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
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                </span>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-semibold tracking-tight">
                  Description
                </h2>
                <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {listing.description || "No additional description provided."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="border-border/70">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  Contact seller
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Reach out directly if you want to ask a question or arrange a handoff.
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">{sellerName}</p>
                <p className="text-muted-foreground">
                  {listing.seller?.is_verified
                    ? "Verified student"
                    : "Student seller"}
                </p>
                {listing.seller?.university ? (
                  <p className="text-muted-foreground">
                    {listing.seller.university}
                  </p>
                ) : null}
                {listing.seller?.email ? (
                  <p className="break-all text-muted-foreground">
                    {listing.seller.email}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                {contactHref ? (
                  <a
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                    href={contactHref}
                  >
                    Contact seller
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Seller contact details are not available.
                  </p>
                )}
                <Link
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  href="/home"
                >
                  Back to listings
                </Link>
              </div>
            </CardContent>
          </Card>

          {canManage ? (
            <Card className="border-border/70">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Manage listing
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Owner and admin actions for this listing.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/listings/${listing.id}/edit`}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    Edit listing
                  </Link>
                  <DeleteListingButton listingId={listing.id} />
                  <ListingStatusButton
                    listingId={listing.id}
                    currentStatus={listing.status}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function ListingDetailFallback() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-72 animate-pulse rounded bg-muted" />
        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-2xl border border-border/70">
          <div className="aspect-[4/3] animate-pulse bg-muted/60" />
          <div className="space-y-4 p-6">
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-56 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
          <div className="h-40 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
        </div>
      </div>
    </section>
  );
}