import { redirect } from "next/navigation";
import { Suspense } from "react";

import { FakeWithdrawalForm } from "@/components/fake-withdrawal-form";
import { isMarketplaceSuspended } from "@/lib/admin";
import { formatPrice, getViewerContext } from "@/lib/marketplace";
import { calculateWalletBalance, getWalletTransactions } from "@/lib/wallet";

function transactionLabel(type: "sale" | "withdrawal") {
  return type === "sale" ? "Sale credit" : "Fake withdrawal";
}

async function WalletContent() {
  const { profile, user } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  const walletTransactions = await getWalletTransactions(user.id);
  const balance = calculateWalletBalance(walletTransactions);
  const isSuspended = isMarketplaceSuspended(profile);

  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Wallet</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Demo seller earnings from Stripe test payments. Withdrawals here are fake AcadEx records only.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4 rounded-xl border border-border/70 bg-card p-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Available balance</p>
            <p className="text-4xl font-semibold tracking-tight">{formatPrice(balance)}</p>
          </div>
          {isSuspended ? (
            <p className="text-sm text-muted-foreground">
              Marketplace actions are disabled while your account is suspended.
            </p>
          ) : (
            <FakeWithdrawalForm availableBalance={balance} />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold tracking-tight">Wallet activity</h2>
          {walletTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
          ) : (
            <div className="space-y-3">
              {walletTransactions.map((entry) => (
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
    </section>
  );
}

function WalletFallback() {
  return (
    <section className="space-y-8">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-9 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="h-64 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
      </div>
    </section>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<WalletFallback />}>
      <WalletContent />
    </Suspense>
  );
}
