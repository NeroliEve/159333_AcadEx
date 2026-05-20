import { redirect } from "next/navigation";
import { Suspense } from "react";

import { isMarketplaceSuspended } from "@/lib/admin";
import { EmptyState } from "@/components/empty-state";
import { MessagesShell } from "@/components/messages-shell";
import { getViewerContext } from "@/lib/marketplace";

async function MessagesLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile, user } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  if (isMarketplaceSuspended(profile)) {
    return (
      <EmptyState
        actionHref="/home"
        actionLabel="Back to home"
        description="Your account is currently suspended from marketplace activity, so messaging is unavailable."
        eyebrow="Messages"
        title="Messaging is disabled"
      />
    );
  }

  return (
    <MessagesShell initialSummaries={[]}>
      {children}
    </MessagesShell>
  );
}

function MessagesLayoutFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Loading messages...</p>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-9 w-72 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="h-[32rem] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
        <div className="h-[32rem] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      </div>
    </div>
  );
}

export default function MessagesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<MessagesLayoutFallback />}>
      <MessagesLayoutContent>{children}</MessagesLayoutContent>
    </Suspense>
  );
}
