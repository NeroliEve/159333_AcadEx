import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AccountSecurityForm } from "@/components/account-security-form";
import { EditProfileForm } from "@/components/edit-profile-form";
import { ListingCard } from "@/components/listing-card";
import { ReviewForm } from "@/components/review-form";
import { TransactionActions } from "@/components/transaction-actions";
import {
  formatListingCondition,
  formatPrice,
  getMyListings,
  getMyTransactions,
  getReviewForTransaction,
  getSavedListings,
  getUniversityOptions,
  getViewerContext,
  type ReviewData,
  type TransactionData,
} from "@/lib/marketplace";

async function ProfileContent() {
  const { user, profile } = await getViewerContext();

  if (!user) redirect("/auth/login");

  const [listings, universities, transactions, savedListings] = await Promise.all([
    getMyListings(user.id),
    getUniversityOptions(true),
    getMyTransactions(user.id),
    getSavedListings(user.id),
  ]);

  const completedTxIds = [...transactions.buying, ...transactions.selling]
    .filter((tx) => tx.status === "completed")
    .map((tx) => tx.id);

  const reviewMap = new Map<string, ReviewData | null>();
  await Promise.all(
    completedTxIds.map(async (txId) => {
      const review = await getReviewForTransaction(txId, user.id);
      reviewMap.set(txId, review);
    }),
  );

  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Your account
        </h1>
      </div>

      <EditProfileForm key={profile?.id} profile={profile} universities={universities} />
      <AccountSecurityForm email={user.email ?? profile?.email ?? ""} />

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Your listings
          </h2>
          <p className="text-sm text-muted-foreground">
            All your listings across every status.
          </p>
        </div>

        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t listed any books yet.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                viewerId={profile?.id}
                viewerRole={profile?.role}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Saved listings</h2>
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
                viewerId={profile?.id}
                viewerRole={profile?.role}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Transaction history</h2>
          <p className="text-sm text-muted-foreground">
            Your purchases and sales across all statuses.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-semibold tracking-tight">Buying</h3>
          {transactions.buying.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.buying.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  existingReview={reviewMap.get(tx.id) ?? null}
                  transaction={tx}
                  viewerId={user.id}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-base font-semibold tracking-tight">Selling</h3>
          {transactions.selling.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.selling.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  existingReview={reviewMap.get(tx.id) ?? null}
                  transaction={tx}
                  viewerId={user.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function transactionStatusBadge(status: TransactionData["status"]) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    case "mismatch":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

function TransactionRow({
  transaction: tx,
  viewerId,
  existingReview,
}: {
  transaction: TransactionData;
  viewerId: string;
  existingReview: ReviewData | null;
}) {
  const isSeller = tx.seller_id === viewerId;
  const otherParty = isSeller ? tx.buyer : tx.seller;
  const otherName = otherParty
    ? `${otherParty.first_name} ${otherParty.last_name}`.trim() || otherParty.username
    : "Unknown";

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-secondary">
            {tx.listing?.primary_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={tx.listing.title}
                className="h-full w-full object-cover"
                src={tx.listing.primary_image_url}
              />
            ) : (
              <span className="text-xs text-muted-foreground">No img</span>
            )}
          </div>

          <div className="space-y-1">
            <Link
              href={`/listings/${tx.listing_id}`}
              className="text-sm font-semibold leading-tight underline underline-offset-2 transition-colors hover:text-foreground"
            >
              {tx.listing?.title ?? "Listing"}
            </Link>
            <p className="text-xs text-muted-foreground">
              {isSeller ? `Buyer: ${otherName}` : `Seller: ${otherName}`}
            </p>
            {tx.listing?.condition ? (
              <p className="text-xs text-muted-foreground">
                {formatListingCondition(tx.listing.condition)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${transactionStatusBadge(tx.status)}`}>
            {tx.status}
          </span>
          <p className="text-sm font-semibold">
            {tx.agreed_price != null ? formatPrice(tx.agreed_price) : "Price TBC"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(tx.created_at).toLocaleDateString("en-NZ", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {tx.status === "pending" ? (
        <TransactionActions
          transactionId={tx.id}
          isAccepted={!!tx.reservation_confirmed_at}
          isSeller={isSeller}
        />
      ) : null}

      {tx.conversation_id ? (
        <div className="flex">
          <Link
            href={`/messages/${tx.conversation_id}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Open conversation
          </Link>
        </div>
      ) : null}

      {tx.status === "completed" && otherParty ? (
        <div className="border-t border-border/70 pt-3">
          <ReviewForm
            existingReview={existingReview}
            revieweeId={otherParty.id}
            reviewerRole={isSeller ? "seller" : "buyer"}
            transactionId={tx.id}
          />
        </div>
      ) : null}
    </div>
  );
}

function ProfileContentFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>

      <div className="h-64 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-64 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileContentFallback />}>
      <ProfileContent />
    </Suspense>
  );
}
