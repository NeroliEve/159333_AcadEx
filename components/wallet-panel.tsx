"use client";

import { useEffect, useState } from "react";

import { FakeWithdrawalForm } from "@/components/fake-withdrawal-form";
import type { ApiResponse } from "@/lib/api";
import type { WalletTransactionData } from "@/lib/wallet";

type WalletData = {
  balance: number;
  isSuspended: boolean;
  transactions: WalletTransactionData[];
};

function transactionLabel(type: "sale" | "withdrawal") {
  return type === "sale" ? "Sale credit" : "Fake withdrawal";
}

function formatPrice(price: number | null) {
  if (price == null) return "Price on request";

  return new Intl.NumberFormat("en-NZ", {
    currency: "NZD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(price);
}

function WalletPanelSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="h-64 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
      <div className="h-64 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
    </div>
  );
}

export function WalletPanel() {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWallet() {
      try {
        const response = await fetch("/api/profile/wallet", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<WalletData>;

        if (cancelled) return;

        if (!response.ok || payload.status === "error") {
          setError(payload.status === "error" ? payload.message : "Could not load wallet.");
          return;
        }

        setData(payload.data);
      } catch {
        if (!cancelled) {
          setError("Could not reach the wallet endpoint.");
        }
      }
    }

    void loadWallet();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!data) {
    return <WalletPanelSkeleton />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-4 rounded-xl border border-border/70 bg-card p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="text-4xl font-semibold tracking-tight">
            {formatPrice(data.balance)}
          </p>
        </div>
        {data.isSuspended ? (
          <p className="text-sm text-muted-foreground">
            Marketplace actions are disabled while your account is suspended.
          </p>
        ) : (
          <FakeWithdrawalForm availableBalance={data.balance} />
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Wallet activity</h2>
        {data.transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
        ) : (
          <div className="space-y-3">
            {data.transactions.map((entry) => (
              <div
                className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-card p-4"
                key={entry.id}
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{transactionLabel(entry.type)}</p>
                  {entry.description ? (
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleDateString("en-NZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    entry.type === "withdrawal" ? "text-destructive" : "text-green-700"
                  }`}
                >
                  {entry.type === "withdrawal" ? "-" : "+"}
                  {formatPrice(entry.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
