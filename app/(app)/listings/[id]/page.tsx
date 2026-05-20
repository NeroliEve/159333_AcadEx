import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { DeleteListingButton } from "@/components/delete-listing-button";
import { ListingDetailGallery } from "@/components/listing-detail-gallery";
import { ListingStatusButton } from "@/components/listing-status-button";
import { ReportButton } from "@/components/report-button";
import { RequestToBuyButton } from "@/components/request-to-buy-button";
import { RequestToTradeButton } from "@/components/request-to-trade-button";
import { Card, CardContent } from "@/components/ui/card";
import { isMarketplaceSuspended } from "@/lib/admin";
import { canViewArchivedListing } from "@/lib/listing-archive";
import { getVisibleSellerUniversity } from "@/lib/listing-visibility";
import {
  formatListingCondition,
  formatPrice,
  getListingRequestState,
  getListingById,
  getListingTransactionParticipantIds,
  getMyAvailableListings,
  getProfileDisplayName,
  getViewerContext,
  shouldShowListingRequestActions,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

function formatListingType(type: string) {
  switch (type) {
    case "trade_only":
      return "Trade only";
    case "sale_or_trade":
      return "Sale or trade";
    default:
      return "For sale";
  }
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasEnvVars) {
    return (
      <section className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Listing</p>
        <h1 className="text-3xl font-semibold tracking-tight">Supabase setup is still missing</h1>
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
  const { user, profile } = await getViewerContext();
  const isSuspended = isMarketplaceSuspended(profile);
  const isAdmin = profile?.role === "admin" && !isSuspended;
  const { listing, error } = await getListingById(id, {
    bypassBlock: isAdmin,
    viewerId: user?.id,
  });

  if (error || !listing) notFound();

  const requestState = user && user.id !== listing.seller_id
    ? await getListingRequestState(id, user.id)
    : null;

  const sellerName = getProfileDisplayName(listing.seller);
  const isOwner = user?.id === listing.seller_id;
  const isArchived = listing.status === "archived" || !!listing.archived_at;

  if (isArchived) {
    const participantIds = await getListingTransactionParticipantIds(id);
    const canViewArchived = canViewArchivedListing({
      isAdmin,
      participantIds,
      sellerId: listing.seller_id,
      viewerId: user?.id,
    });

    if (!canViewArchived) notFound();
  }

  const canManage = !isSuspended && (isOwner || isAdmin);
  const isTrade =
    listing.listing_type === "trade_only" || listing.listing_type === "sale_or_trade";
  const canBuy = listing.listing_type !== "trade_only";
  const canTrade = isTrade;
  const sellerUniversity = getVisibleSellerUniversity(listing);
  const hasViewerPendingTransaction = !!requestState?.pendingTransaction;
  const showRequestActions = !!user && !isOwner && !isSuspended && shouldShowListingRequestActions({
    hasViewerPendingTransaction,
    listingStatus: listing.status,
  });
  const pendingRequestType = requestState?.pendingTransaction?.request_type ?? null;
  const showBuyAction = canBuy && (!pendingRequestType || pendingRequestType === "buy");
  const showTradeAction = canTrade && (!pendingRequestType || pendingRequestType === "trade");
  const pendingRequestAccepted = !!requestState?.pendingTransaction?.reservation_confirmed_at;

  const offerableListings =
    canTrade && user && !isOwner && !isSuspended && listing.status === "available"
      ? (await getMyAvailableListings(user.id)).filter((entry) => entry.id !== listing.id)
      : [];

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Listing details</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="break-words text-3xl font-semibold tracking-tight">{listing.title}</h1>
            {listing.author ? (
              <p className="text-sm text-muted-foreground">by {listing.author}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Posted by{" "}
              {listing.seller?.username ? (
                <Link
                  href={`/profile/${listing.seller.username}`}
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  {sellerName}
                </Link>
              ) : (
                sellerName
              )}
            </p>
          </div>
          <div className="shrink-0 text-left sm:text-right">
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
            <ListingDetailGallery
              images={listing.images}
              primaryImageUrl={listing.primary_image_url}
              title={listing.title}
            />

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {formatListingCondition(listing.condition)}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                  {formatListingType(listing.listing_type)}
                </span>
                {listing.course?.course_code ? (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                    {listing.course.course_code}
                  </span>
                ) : null}
                {sellerUniversity ? (
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                    {sellerUniversity}
                  </span>
                ) : null}
                <span className="rounded-full bg-secondary px-2.5 py-1 capitalize text-secondary-foreground">
                  {listing.status}
                </span>
              </div>

              {(listing.edition || listing.isbn || listing.publisher || listing.course?.course_name) ? (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold tracking-tight">Book details</h2>
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm sm:gap-x-6">
                    {listing.edition ? (
                      <>
                        <dt className="text-muted-foreground">Edition</dt>
                        <dd className="break-words">{listing.edition}</dd>
                      </>
                    ) : null}
                    {listing.publisher ? (
                      <>
                        <dt className="text-muted-foreground">Publisher</dt>
                        <dd className="break-words">{listing.publisher}</dd>
                      </>
                    ) : null}
                    {listing.isbn ? (
                      <>
                        <dt className="text-muted-foreground">ISBN</dt>
                        <dd className="break-words font-mono text-xs">{listing.isbn}</dd>
                      </>
                    ) : null}
                    {listing.course?.course_name ? (
                      <>
                        <dt className="text-muted-foreground">Course</dt>
                        <dd className="break-words">
                          {listing.course.course_code
                            ? `${listing.course.course_code} · ${listing.course.course_name}`
                            : listing.course.course_name}
                        </dd>
                      </>
                    ) : null}
                  </dl>
                </div>
              ) : null}

              <div className="space-y-3">
                <h2 className="text-base font-semibold tracking-tight">Description</h2>
                <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {listing.description || "No additional description provided."}
                </p>
              </div>

              {isTrade ? (
                <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/40 p-4">
                  <p className="text-sm font-medium">Open to trading</p>
                  {listing.wanted_trade_text ? (
                    <p className="text-sm text-muted-foreground">
                      Looking for: {listing.wanted_trade_text}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      The seller is open to a book swap - ask them what they are looking for.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <Card className="border-border/70">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">Contact seller</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Acadex keeps contact inside the app. Send a buy or trade request to start a conversation for sorting out pickup, payment, or swap details.
                </p>
              </div>

              <div className="space-y-1 text-sm">
                {listing.seller?.username ? (
                  <Link
                    href={`/profile/${listing.seller.username}`}
                    className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                  >
                    {sellerName}
                  </Link>
                ) : (
                  <p className="font-medium">{sellerName}</p>
                )}
                <p className="text-muted-foreground">
                  {listing.seller?.is_verified ? "Verified student" : "Student seller"}
                </p>
                {sellerUniversity ? (
                  <p className="text-muted-foreground">{sellerUniversity}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                {showRequestActions ? (
                  <>
                    {showBuyAction ? (
                      <RequestToBuyButton
                        conversationId={requestState?.conversationId}
                        canRequest={requestState?.canRequestToBuy ?? true}
                        listingId={listing.id}
                        hasPendingTransaction={hasViewerPendingTransaction}
                        isAccepted={pendingRequestAccepted}
                        remainingAttempts={requestState?.remainingBuyAttempts ?? 3}
                        statusMessage={requestState?.buyStatusMessage}
                      />
                    ) : null}
                    {showTradeAction ? (
                      <RequestToTradeButton
                        conversationId={requestState?.pendingTransaction?.conversation_id}
                        listingId={listing.id}
                        hasPendingTransaction={hasViewerPendingTransaction}
                        isAccepted={pendingRequestAccepted}
                        offerableListings={offerableListings}
                      />
                    ) : null}
                  </>
                ) : null}

                {!hasViewerPendingTransaction && user && !isOwner && !isSuspended ? (
                  <p className="text-sm text-muted-foreground">
                    Messaging opens after you send a request.
                  </p>
                ) : user && isSuspended ? (
                  <p className="text-sm text-muted-foreground">
                    Your account is suspended from marketplace activity.
                  </p>
                ) : !user ? (
                  <p className="text-sm text-muted-foreground">
                    Sign in to start a conversation through Acadex.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Seller contact stays private unless they choose to share it in chat.
                  </p>
                )}

                <Link
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                  href="/home"
                >
                  Back to listings
                </Link>

                {user && !isOwner && !isSuspended ? (
                  <div className="flex justify-center pt-1">
                    <ReportButton targetKind="listing" targetId={listing.id} label="Report this listing" />
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {canManage ? (
            <Card className="border-border/70">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">Manage listing</h2>
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
                  <ListingStatusButton listingId={listing.id} currentStatus={listing.status} />
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
