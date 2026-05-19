"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { MessagesProvider, useMessagesContext } from "@/components/messages-context";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiResponse } from "@/lib/api";
import { isUnacceptedBuyRequest } from "@/lib/exchange-flow";
import type { ConversationMessage, ConversationSummary } from "@/lib/messages";
import { cn } from "@/lib/utils";

type MessagesShellProps = {
  children: React.ReactNode;
  initialArchivedSummaries?: ConversationSummary[];
  initialSummaries: ConversationSummary[];
};

function formatSidebarTime(value: string | null, fallback: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
  }).format(new Date(value ?? fallback));
}

function getConversationPreview(summary: ConversationSummary) {
  if (!summary.latestMessage) {
    return "No messages yet. Start the conversation.";
  }

  return summary.latestMessage.content;
}

function getParticipantDisplayName(
  participant: ConversationSummary["otherParticipant"] | ConversationMessage["sender"],
) {
  if (!participant) return "Student";

  const fullName = `${participant.first_name} ${participant.last_name}`.trim();
  if (fullName) return fullName;
  if (participant.username) return participant.username;

  return participant.email ?? "Student";
}

function MessagesSidebar() {
  const pathname = usePathname();
  const {
    archivedSummaries,
    setArchivedSummaries,
    setSummaries,
    summaries,
  } = useMessagesContext();
  const [isLoading, setIsLoading] = useState(
    summaries.length === 0 && archivedSummaries.length === 0,
  );

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function loadSummaries() {
      try {
        const response = await fetch("/api/messages", { cache: "no-store" });
        const payload = (await response.json()) as ApiResponse<{
          archivedSummaries: ConversationSummary[];
          summaries: ConversationSummary[];
        }>;

        if (cancelled) return;

        if (response.ok && payload.status === "success") {
          setArchivedSummaries(payload.data.archivedSummaries);
          setSummaries(payload.data.summaries);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSummaries();
    intervalId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadSummaries();
    }, 30000);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [setArchivedSummaries, setSummaries]);

  function renderSummary(summary: ConversationSummary) {
    const participant = summary.otherParticipant;
    const participantName = getParticipantDisplayName(participant);
    const isActive = pathname === `/messages/${summary.id}`;
    const isBuyRequest = !!summary.transaction && isUnacceptedBuyRequest({
      offeredListingId: summary.transaction.offered_listing_id,
      requestType: summary.transaction.request_type,
      reservationConfirmedAt: summary.transaction.reservation_confirmed_at,
      status: summary.transaction.status,
    });

    return (
      <Link
        key={summary.id}
        href={`/messages/${summary.id}`}
        className={cn(
          "block border-b border-border/70 px-5 py-4 transition-colors last:border-b-0 hover:bg-secondary/40",
          isActive && "bg-secondary/60",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold">
              {summary.listing?.title ?? "Listing conversation"}
            </p>
            <p
              className={cn(
                "truncate text-xs text-muted-foreground",
                isBuyRequest && "font-semibold text-foreground",
              )}
            >
              {isBuyRequest ? "Buy request" : participantName}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs text-muted-foreground">
              {formatSidebarTime(summary.last_message_at, summary.created_at)}
            </p>
            {summary.unreadCount > 0 ? (
              <span className="mt-2 inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {summary.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
        {!isBuyRequest ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {getConversationPreview(summary)}
          </p>
        ) : null}
      </Link>
    );
  }

  return (
    <Card className="border-border/70">
      <CardContent className="p-0">
        <div className="border-b border-border/70 px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight">
            Conversations
          </h2>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3 p-5">
              <p className="text-sm text-muted-foreground">Loading conversations</p>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-lg bg-muted/50"
                />
              ))}
            </div>
          ) : null}
          {summaries.map(renderSummary)}
          {archivedSummaries.length > 0 ? (
            <div className="border-t border-border/70">
              <div className="px-5 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Archived conversations
                </p>
              </div>
              {archivedSummaries.map(renderSummary)}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MessagesShellInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Messages
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Talk with other users
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Sort out your transactions, ask questions about listings, coordinate meetups, and more.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <MessagesSidebar />
        {children}
      </div>
    </div>
  );
}

export function MessagesShell({
  children,
  initialArchivedSummaries = [],
  initialSummaries,
}: MessagesShellProps) {
  return (
    <MessagesProvider
      initialArchivedSummaries={initialArchivedSummaries}
      initialSummaries={initialSummaries}
    >
      <MessagesShellInner>{children}</MessagesShellInner>
    </MessagesProvider>
  );
}
