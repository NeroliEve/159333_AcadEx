"use client";

import { useState } from "react";

type PayTransactionButtonProps = {
  transactionId: string;
};

export function PayTransactionButton({ transactionId }: PayTransactionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setIsLoading(true);
    setError(null);

    const response = await fetch("/api/checkout/session", {
      body: JSON.stringify({ transactionId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = await response.json();

    if (!response.ok || !payload.url) {
      setError(payload.error ?? "Could not start Stripe Checkout.");
      setIsLoading(false);
      return;
    }

    window.location.href = payload.url;
  }

  return (
    <div className="space-y-1">
      <button
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading}
        onClick={handlePay}
        type="button"
      >
        {isLoading ? "Opening Stripe..." : "Pay now"}
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
