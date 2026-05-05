import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ReviewForm } from "@/components/review-form";
import { TransactionActions } from "@/components/transaction-actions";
import { isMarketplaceSuspended } from "@/lib/admin";
import {
  formatListingCondition,
  formatPrice,
  getMyTransactions,
  getReviewForTransaction,
  getViewerContext,
  type ReviewData,
  type TransactionData,
} from "@/lib/marketplace";

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
  isSuspended,
  transaction: tx,
  viewerId,
  existingReview,
}: {
  isSuspended: boolean;
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

      {tx.status === "pending" && !isSuspended ? (
        <TransactionActions
          transactionId={tx.id}
          isAccepted={!!tx.reservation_confirmed_at}
          isSeller={isSeller}
        />
      ) : null}

      {tx.conversation_id && !isSuspended ? (
        <div className="flex">
          <Link
            href={`/messages/${tx.conversation_id}`}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Open conversation
          </Link>
        </div>
      ) : null}

      {tx.status === "completed" && otherParty && !isSuspended ? (
        <div className="border-t border-border/70 pt-3">
          <ReviewForm
            existingReview={existingReview}
            revieweeId={otherParty.id}
            reviewerRole={isSeller ? "seller" : "buyer"}
            transactionId={tx.id}
          />
        </div>
      ) : null}

      {isSuspended ? (
        <p className="text-xs text-muted-foreground">
          Marketplace actions are disabled while your account is suspended.
        </p>
      ) : null}
    </div>
  );
}

async function ProfileTransactionsContent() {
  const { profile, user } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  const transactions = await getMyTransactions(user.id);
  const isSuspended = isMarketplaceSuspended(profile);
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
        <h1 className="text-3xl font-semibold tracking-tight">Transaction history</h1>
        <p className="text-sm text-muted-foreground">
          Your purchases and sales across all statuses.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-base font-semibold tracking-tight">Buying</h2>
          {transactions.buying.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchases yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.buying.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  existingReview={reviewMap.get(tx.id) ?? null}
                  isSuspended={isSuspended}
                  transaction={tx}
                  viewerId={user.id}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold tracking-tight">Selling</h2>
          {transactions.selling.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.selling.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  existingReview={reviewMap.get(tx.id) ?? null}
                  isSuspended={isSuspended}
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

function ProfileTransactionsFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-44 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
          />
        ))}
      </div>
    </section>
  );
}

export default function ProfileTransactionsPage() {
  return (
    <Suspense fallback={<ProfileTransactionsFallback />}>
      <ProfileTransactionsContent />
    </Suspense>
  );
}
