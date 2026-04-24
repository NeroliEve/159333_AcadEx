import { redirect } from "next/navigation";
import { Suspense } from "react";

import { MessagesShell } from "@/components/messages-shell";
import { getMyConversationSummaries } from "@/lib/messages";
import { getViewerContext } from "@/lib/marketplace";

async function MessagesLayoutContent({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  const summaries = await getMyConversationSummaries(user.id);

  return (
    <MessagesShell initialSummaries={summaries}>
      {children}
    </MessagesShell>
  );
}

function MessagesLayoutFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
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
