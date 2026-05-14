"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type FakeWithdrawalFormProps = {
  availableBalance: number;
};

export function FakeWithdrawalForm({ availableBalance }: FakeWithdrawalFormProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/wallet/withdrawals", {
      body: JSON.stringify({ amount }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Could not create withdrawal.");
      setIsSubmitting(false);
      return;
    }

    setAmount("");
    setMessage("Fake withdrawal recorded.");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="withdrawal-amount">
          Withdrawal amount
        </label>
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          disabled={availableBalance <= 0 || isSubmitting}
          id="withdrawal-amount"
          min="0.01"
          max={availableBalance}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          step="0.01"
          type="number"
          value={amount}
        />
      </div>
      <button
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={availableBalance <= 0 || isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Recording..." : "Fake withdraw"}
      </button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </form>
  );
}
