"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type OfferableListing = {
  id: string;
  title: string;
  primary_image_url: string | null;
  price: number | null;
  listing_type: "sale_only" | "trade_only" | "sale_or_trade";
};

function formatOfferPrice(entry: OfferableListing) {
  if (entry.listing_type === "trade_only" || entry.price == null) {
    return "Trade only";
  }
  return new Intl.NumberFormat("en-NZ", {
    currency: "NZD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(entry.price);
}

type RequestToTradeButtonProps = {
  listingId: string;
  hasPendingTransaction: boolean;
  conversationId?: string | null;
  offerableListings: OfferableListing[];
};

export function RequestToTradeButton({
  listingId,
  hasPendingTransaction,
  conversationId,
  offerableListings,
}: RequestToTradeButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(hasPendingTransaction);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    conversationId ?? null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!selectedId) {
      setError("Pick one of your listings to offer.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, offeredListingId: selectedId }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setIsLoading(false);
      return;
    }

    setIsPending(true);
    setActiveConversationId(json.conversationId ?? null);
    setIsModalOpen(false);
    setIsLoading(false);
    router.refresh();
  }

  if (isPending) {
    return (
      <div className="space-y-1">
        <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground">
          Trade request sent
        </div>
        <p className="text-xs text-muted-foreground text-center">
          The seller has been notified. You can continue in the conversation thread.
        </p>
        {activeConversationId ? (
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            href={`/messages/${activeConversationId}`}
          >
            Open conversation
          </Link>
        ) : null}
      </div>
    );
  }

  if (offerableListings.length === 0) {
    return (
      <div className="space-y-1">
        <button
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
          disabled
          type="button"
        >
          Request to trade
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Create a listing of your own first so you have a book to offer.
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
        onClick={() => setIsModalOpen(true)}
        type="button"
      >
        Request to trade
      </button>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="absolute inset-0" onClick={() => !isLoading && setIsModalOpen(false)} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/70 bg-background shadow-2xl">
            <div className="border-b border-border/70 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight">Pick a book to offer</h2>
              <p className="text-sm text-muted-foreground">
                The seller will see this listing as your trade offer. If they accept, both books are reserved until completion.
              </p>
            </div>

            <div className="grid gap-2 px-6 py-4">
              {offerableListings.map((entry) => {
                const isSelected = entry.id === selectedId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                    className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/70 hover:bg-accent"
                    }`}
                  >
                    <div className="h-14 w-12 shrink-0 overflow-hidden rounded-md bg-secondary/40">
                      {entry.primary_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={entry.title}
                          src={entry.primary_image_url}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium">{entry.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatOfferPrice(entry)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {error ? (
              <p className="px-6 pb-2 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="flex items-center justify-end gap-2 border-t border-border/70 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !selectedId}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Sending…" : "Send trade request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
