import { redirect } from "next/navigation";
import { Suspense } from "react";

import { WalletPanel } from "@/components/wallet-panel";
import { getViewerContext } from "@/lib/marketplace";

async function WalletContent() {
  const { user } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

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

      <WalletPanel />
    </section>
  );
}

function WalletFallback() {
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
      <p className="text-sm text-muted-foreground">Loading account settings...</p>
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
