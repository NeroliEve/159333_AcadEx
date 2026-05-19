import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state";
import { getMyConversationSummaries } from "@/lib/messages";
import { getViewerContext } from "@/lib/marketplace";

async function MessagesIndexContent() {
  const { user } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  const conversations = await getMyConversationSummaries(user.id);

  if (conversations.length === 0) {
    return (
      <section>
        <EmptyState
          actionHref="/browse"
          actionLabel="Browse listings"
          description="Conversations start after a buyer opens a transaction request. Once you have one, the thread will appear here for text-only messaging."
          eyebrow="Messages"
          title="No conversations yet"
        />
      </section>
    );
  }

  redirect(`/messages/${conversations[0].id}`);
}

function MessagesIndexFallback() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Loading messages</p>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-48 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}

export default function MessagesIndexPage() {
  return (
    <Suspense fallback={<MessagesIndexFallback />}>
      <MessagesIndexContent />
    </Suspense>
  );
}
