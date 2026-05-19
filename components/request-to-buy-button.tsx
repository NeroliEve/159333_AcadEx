"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  MAX_BUY_REQUEST_MESSAGE_LENGTH,
  validateBuyRequestMessage,
} from "@/lib/exchange-flow";

type RequestToBuyButtonProps = {
  listingId: string;
  canRequest: boolean;
  hasPendingTransaction: boolean;
  isAccepted?: boolean;
  conversationId?: string | null;
  remainingAttempts: number;
  statusMessage?: string | null;
};

export function RequestToBuyButton({
  listingId,
  canRequest,
  hasPendingTransaction,
  isAccepted = false,
  conversationId,
  remainingAttempts,
  statusMessage,
}: RequestToBuyButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(hasPendingTransaction);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    conversationId ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    const validation = validateBuyRequestMessage(message);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, requestMessage: validation.message }),
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
    setMessage("");
    setIsLoading(false);
    router.refresh();
  }

  if (isPending) {
    return (
      <div className="space-y-1">
        <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground">
          {isAccepted ? "Request accepted" : "Request sent"}
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {isAccepted
            ? "Chat is open with the seller."
            : "The seller has been notified. Chat opens after they accept."}
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
    <div className="space-y-2">
      {statusMessage ? (
        <p className="rounded-md border border-border/70 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {statusMessage}
        </p>
      ) : null}
      <button
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading || !canRequest}
        onClick={() => {
          setError(null);
          setIsModalOpen(true);
        }}
        type="button"
      >
        Request to buy
      </button>
      {!canRequest && remainingAttempts <= 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          The seller declined this buy request 3 times.
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="absolute inset-0" onClick={() => !isLoading && setIsModalOpen(false)} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/70 bg-background shadow-2xl">
            <div className="border-b border-border/70 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight">Send buy request</h2>
              <p className="text-sm text-muted-foreground">
                Write a short message for the seller before they review your request.
              </p>
            </div>

            <div className="space-y-2 px-6 py-4">
              <label className="space-y-2 text-sm font-medium">
                <span>Message</span>
                <textarea
                  className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
                  disabled={isLoading}
                  maxLength={MAX_BUY_REQUEST_MESSAGE_LENGTH}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Ask whether the book is still available or suggest pickup details."
                  value={message}
                />
              </label>
              <p className="text-right text-[11px] text-muted-foreground">
                {message.length}/{MAX_BUY_REQUEST_MESSAGE_LENGTH}
              </p>
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
                onClick={handleRequest}
                disabled={isLoading || !message.trim()}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send buy request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
