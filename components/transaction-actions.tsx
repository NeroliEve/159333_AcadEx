"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TransactionActionsProps = {
  canCancel: boolean;
  canComplete: boolean;
  transactionId: string;
  isSeller: boolean;
  // Whether the seller has already accepted this request (reservation_confirmed_at is set)
  isAccepted: boolean;
};

export function TransactionActions({
  canCancel,
  canComplete,
  transactionId,
  isSeller,
  isAccepted,
}: TransactionActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(action: "accept" | "complete" | "cancel") {
    setIsLoading(true);
    setError(null);

    const res = await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {isSeller && !isAccepted && (
          // Seller accepts one request — listing locks and other requests are cancelled
          <button
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={() => handleAction("accept")}
            type="button"
          >
            Accept request
          </button>
        )}
        {isSeller && isAccepted && canComplete && (
          // Once accepted, seller can mark the exchange as done
          <button
            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={() => handleAction("complete")}
            type="button"
          >
            Mark as completed
          </button>
        )}
        {canCancel ? (
          <button
            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={() => handleAction("cancel")}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
