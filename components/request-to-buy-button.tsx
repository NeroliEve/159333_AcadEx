"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type RequestToBuyButtonProps = {
  listingId: string;
  // If the viewer already has a pending transaction we show a different state
  hasPendingTransaction: boolean;
};

export function RequestToBuyButton({ listingId, hasPendingTransaction }: RequestToBuyButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(hasPendingTransaction);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setIsLoading(false);
      return;
    }

    setIsPending(true);
    setIsLoading(false);
    // Refresh the page so the listing status badge updates
    router.refresh();
  }

  if (isPending) {
    return (
      <div className="space-y-1">
        <div className="inline-flex h-10 w-full items-center justify-center rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground">
          Request sent
        </div>
        <p className="text-xs text-muted-foreground text-center">
          The seller has been notified. Check your transaction history for updates.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading}
        onClick={handleRequest}
        type="button"
      >
        {isLoading ? "Sending request…" : "Request to buy"}
      </button>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
