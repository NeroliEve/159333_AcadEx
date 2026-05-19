"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Textarea } from "@/components/ui/textarea";
import { MAX_BUY_REQUEST_MESSAGE_LENGTH } from "@/lib/exchange-flow";

type RequestToBuyButtonProps = {
  listingId: string;
  canRequest: boolean;
  hasPendingTransaction: boolean;
  conversationId?: string | null;
  remainingAttempts: number;
  statusMessage?: string | null;
};

export function RequestToBuyButton({
  listingId,
  canRequest,
  hasPendingTransaction,
  conversationId,
  remainingAttempts,
  statusMessage,
}: RequestToBuyButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(hasPendingTransaction);
  const [message, setMessage] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    conversationId ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    const requestMessage = message.trim();

    if (!requestMessage) {
      setError("Add a short message for the seller.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, requestMessage }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setIsLoading(false);
      return;
    }

    setIsPending(true);
    setActiveConversationId(json.conversationId ?? null);
    setMessage("");
    setIsLoading(false);
    router.refresh();
  }

  if (isPending) {
    return (
      <div className="space-y-1">
        <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground">
          Request sent
        </div>
        <p className="text-center text-xs text-muted-foreground">
          The seller has been notified. Chat opens after they accept.
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
      <Textarea
        disabled={!canRequest || isLoading}
        maxLength={MAX_BUY_REQUEST_MESSAGE_LENGTH}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Add a short message for the seller."
        rows={3}
        value={message}
      />
      <p className="text-right text-[11px] text-muted-foreground">
        {message.length}/{MAX_BUY_REQUEST_MESSAGE_LENGTH}
      </p>
      <button
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading || !canRequest || message.trim().length === 0}
        onClick={handleRequest}
        type="button"
      >
        {isLoading ? "Sending request..." : "Request to buy"}
      </button>
      {!canRequest && remainingAttempts <= 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          The seller declined this buy request 3 times.
        </p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
