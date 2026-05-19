"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { validateTradeRequestMessage } from "@/lib/exchange-flow";

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
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const validation = validateTradeRequestMessage(message);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        offeredListingId: selectedId,
        requestMessage: validation.message,
        requestType: "trade",
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setIsLoading(false);
      return;
    }

    const nextConversationId = json.conversationId ?? null;
    setIsPending(true);
    setActiveConversationId(nextConversationId);
    setIsModalOpen(false);
    setIsLoading(false);

    if (nextConversationId) {
      router.push(`/messages/${nextConversationId}`);
      return;
    }

    router.refresh();
  }

  if (isPending) {
    return (
      <div className="space-y-1">
        <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground">
          Trade request sent
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Continue the conversation with the seller in messages.
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
              <h2 className="text-lg font-semibold tracking-tight">Send trade request</h2>
              <p className="text-sm text-muted-foreground">
                Write a short message to start discussing a swap with the seller.
              </p>
            </div>

            <div className="space-y-4 px-6 py-4">
              <label className="space-y-2 text-sm font-medium">
                <span>Message</span>
                <textarea
                  className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  disabled={isLoading}
                  maxLength={500}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Tell the seller what you would like to trade or ask what they are looking for."
                  value={message}
                />
              </label>

              {offerableListings.length > 0 ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Attach one of your listings</p>
                    <p className="text-xs text-muted-foreground">
                      Optional. You can also arrange the trade in chat.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
                      selectedId === null
                        ? "border-primary bg-primary/5"
                        : "border-border/70 hover:bg-accent"
                    }`}
                  >
                    No listing attached
                  </button>

                  {offerableListings.map((entry) => {
                    const isSelected = entry.id === selectedId;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => setSelectedId(entry.id)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
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
              ) : null}
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
                disabled={isLoading || !message.trim()}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send trade request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
