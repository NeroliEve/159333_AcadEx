"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useMessagesContext } from "@/components/messages-context";
import { PayTransactionButton } from "@/components/pay-transaction-button";
import { ReportButton } from "@/components/report-button";
import { ReviewForm } from "@/components/review-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ApiResponse } from "@/lib/api";
import {
  canCancelAcceptedTransaction,
  canReviewTransactionStatus,
  canSendConversationMessage,
  getDeclinedRequestNotice,
} from "@/lib/exchange-flow";
import { MAX_MESSAGE_LENGTH } from "@/lib/message-constants";
import type { ConversationDetail, ConversationMessage, ConversationSummary } from "@/lib/messages";
import { canCompleteTransaction } from "@/lib/payments";
import type { TableRow } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type MessagesWorkspaceProps = {
  initialConversation: ConversationDetail;
  viewerId: string;
};

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
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

function upsertMessage(
  messages: ConversationMessage[],
  nextMessage: ConversationMessage,
) {
  const existingIndex = messages.findIndex((message) => message.id === nextMessage.id);

  if (existingIndex === -1) {
    return [...messages, nextMessage].sort(
      (left, right) => Date.parse(left.created_at) - Date.parse(right.created_at),
    );
  }

  return messages.map((message, index) =>
    index === existingIndex ? { ...message, ...nextMessage } : message,
  );
}

function mergeRealtimeTransaction(
  currentTransaction: ConversationDetail["transaction"],
  transactionRow: TableRow<"transactions">,
): ConversationDetail["transaction"] {
  if (!currentTransaction || currentTransaction.id !== transactionRow.id) {
    return currentTransaction;
  }

  return {
    ...currentTransaction,
    agreed_price: transactionRow.agreed_price,
    agreed_trade_text: transactionRow.agreed_trade_text,
    cancelled_at: transactionRow.cancelled_at,
    completed_at: transactionRow.completed_at,
    conversation_id: transactionRow.conversation_id,
    declined_at: transactionRow.declined_at,
    paid_at: transactionRow.paid_at,
    payment_status: transactionRow.payment_status,
    payment_requested_at: transactionRow.payment_requested_at,
    payment_requested_by: transactionRow.payment_requested_by,
    reservation_confirmed_at: transactionRow.reservation_confirmed_at,
    seller_id: transactionRow.seller_id,
    status: transactionRow.status,
  };
}

function sortConversationSummaries(summaries: ConversationSummary[]) {
  return [...summaries].sort((left, right) => {
    const leftTimestamp = Date.parse(left.last_message_at ?? left.created_at);
    const rightTimestamp = Date.parse(right.last_message_at ?? right.created_at);

    return rightTimestamp - leftTimestamp;
  });
}

export function MessagesWorkspace({
  initialConversation,
  viewerId,
}: MessagesWorkspaceProps) {
  const router = useRouter();
  const { setSummaries, summaries } = useMessagesContext();
  const [conversation, setConversation] = useState(initialConversation);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const activeTransactionId = conversation.transaction?.id ?? null;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversation(initialConversation);
    setDraft("");
    setError(null);
  }, [initialConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages]);

  useEffect(() => {
    const latestMessage = conversation.messages.at(-1) ?? null;
    const unreadCount = conversation.messages.filter(
      (message) => !message.is_read && message.sender_id !== viewerId,
    ).length;

    const nextSummary: ConversationSummary = {
      ...conversation,
      last_message_at: latestMessage?.created_at ?? conversation.last_message_at,
      latestMessage,
      otherParticipant:
        conversation.buyer_id === viewerId ? conversation.seller : conversation.buyer,
      transaction: conversation.transaction,
      unreadCount,
    };

    setSummaries((currentSummaries) => {
      const existingIndex = currentSummaries.findIndex(
        (summary) => summary.id === conversation.id,
      );

      if (existingIndex === -1) {
        return sortConversationSummaries([nextSummary, ...currentSummaries]);
      }

      return sortConversationSummaries(
        currentSummaries.map((summary, index) =>
          index === existingIndex ? { ...summary, ...nextSummary } : summary,
        ),
      );
    });
  }, [conversation, setSummaries, viewerId]);

  useEffect(() => {
    const hasUnreadIncomingMessages = conversation.messages.some(
      (message) => !message.is_read && message.sender_id !== viewerId,
    );

    if (!hasUnreadIncomingMessages) return;

    let cancelled = false;

    async function markConversationRead() {
      const response = await fetch(`/api/conversations/${conversation.id}/read`, {
        method: "POST",
      });

      if (!response.ok || cancelled) return;

      setConversation((currentConversation) => ({
        ...currentConversation,
        messages: currentConversation.messages.map((message) =>
          message.sender_id === viewerId ? message : { ...message, is_read: true },
        ),
      }));
    }

    void markConversationRead();

    return () => {
      cancelled = true;
    };
  }, [conversation.id, conversation.messages, viewerId]);

  useEffect(() => {
    const supabase = createClient();

    function getSenderProfile(senderId: string) {
      if (senderId === conversation.buyer_id) return conversation.buyer;
      if (senderId === conversation.seller_id) return conversation.seller;

      return null;
    }

    function hydrateRealtimeMessage(
      messageRow: TableRow<"messages">,
    ): ConversationMessage {
      return {
        ...messageRow,
        sender: getSenderProfile(messageRow.sender_id),
      };
    }

    const channel = supabase
      .channel(`conversation-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `conversation_id=eq.${conversation.id}`,
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const nextMessage = hydrateRealtimeMessage(payload.new as TableRow<"messages">);

          setConversation((currentConversation) => ({
            ...currentConversation,
            last_message_at: nextMessage.created_at,
            messages: upsertMessage(currentConversation.messages, nextMessage),
          }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          filter: `conversation_id=eq.${conversation.id}`,
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const nextMessage = hydrateRealtimeMessage(payload.new as TableRow<"messages">);

          setConversation((currentConversation) => ({
            ...currentConversation,
            messages: upsertMessage(currentConversation.messages, nextMessage),
          }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          filter: `id=eq.${conversation.id}`,
          schema: "public",
          table: "conversations",
        },
        (payload) => {
          const nextConversation = payload.new as TableRow<"conversations">;

          setConversation((currentConversation) => ({
            ...currentConversation,
            archived_at: nextConversation.archived_at,
            close_after: nextConversation.close_after,
            delete_after: nextConversation.delete_after,
            last_message_at: nextConversation.last_message_at,
          }));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          filter: activeTransactionId
            ? `id=eq.${activeTransactionId}`
            : "id=eq.00000000-0000-0000-0000-000000000000",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          const nextTransaction = payload.new as TableRow<"transactions">;

          setConversation((currentConversation) => ({
            ...currentConversation,
            transaction: mergeRealtimeTransaction(
              currentConversation.transaction,
              nextTransaction,
            ),
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    conversation.buyer,
    conversation.buyer_id,
    conversation.id,
    conversation.seller,
    conversation.seller_id,
    activeTransactionId,
  ]);

  useEffect(() => {
    if (!activeTransactionId || conversation.archived_at) return;
    if (conversation.transaction?.status !== "pending") return;

    let cancelled = false;

    async function refreshConversation() {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<{
        conversation: ConversationDetail;
        viewerId: string;
      }>;

      if (cancelled || !response.ok || payload.status !== "success") return;

      setConversation(payload.data.conversation);
    }

    const intervalId = window.setInterval(() => {
      void refreshConversation();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    activeTransactionId,
    conversation.archived_at,
    conversation.id,
    conversation.transaction?.status,
  ]);

  async function handleSendMessage() {
    const content = draft.trim();

    if (!content || isSending) return;

    setIsSending(true);
    setError(null);

    const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Could not send your message.");
      setIsSending(false);
      return;
    }

    const nextMessage = payload.message as ConversationMessage;

    setConversation((currentConversation) => ({
      ...currentConversation,
      last_message_at: nextMessage.created_at,
      messages: upsertMessage(currentConversation.messages, nextMessage),
    }));
    setDraft("");
    setIsSending(false);
  }

  async function handleTransactionAction(action: "accept" | "decline" | "request_payment" | "complete" | "cancel") {
    if (!conversation.transaction || isActing) return;

    setIsActing(action);
    setError(null);

    const response = await fetch(`/api/transactions/${conversation.transaction.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Could not update this transaction.");
      setIsActing(null);
      return;
    }

    setIsActing(null);
    router.refresh();
  }

  const activeSummary = summaries.find((summary) => summary.id === conversation.id) ?? {
    ...conversation,
    latestMessage: conversation.messages.at(-1) ?? null,
    otherParticipant:
      conversation.buyer_id === viewerId ? conversation.seller : conversation.buyer,
    transaction: conversation.transaction,
    unreadCount: 0,
  };

  const otherParticipant = activeSummary.otherParticipant;
  const otherParticipantName = getParticipantDisplayName(otherParticipant);
  const transaction = conversation.transaction;
  const isSeller = conversation.seller_id === viewerId;
  const isBuyer = conversation.buyer_id === viewerId;
  const isTrade = !!transaction?.offered_listing_id;
  const chatCanSend = canSendConversationMessage({
    archivedAt: conversation.archived_at,
    transaction: transaction
      ? {
          reservationConfirmedAt: transaction.reservation_confirmed_at,
          status: transaction.status,
        }
      : null,
  });
  const requestIsPending = !!transaction && transaction.status === "pending" && !transaction.reservation_confirmed_at;
  const transactionIsAccepted = !!transaction && transaction.status === "pending" && !!transaction.reservation_confirmed_at;
  const transactionIsReviewable = !!transaction && canReviewTransactionStatus(
    transaction.status,
    transaction.reservation_confirmed_at,
  );
  const canCancel = !!transaction && canCancelAcceptedTransaction({
    offeredListingId: transaction.offered_listing_id,
    paymentStatus: transaction.payment_status,
    reservationConfirmedAt: transaction.reservation_confirmed_at,
    status: transaction.status,
  });
  const canComplete = !!transaction && canCompleteTransaction(transaction);
  const buyerCanPay =
    !!transaction &&
    isBuyer &&
    !isTrade &&
    transactionIsAccepted &&
    !!transaction.payment_requested_at &&
    transaction.payment_status !== "paid";
  const sellerCanRequestPayment =
    !!transaction &&
    isSeller &&
    !isTrade &&
    transactionIsAccepted &&
    !transaction.payment_requested_at &&
    transaction.payment_status === "unpaid";
  const declinedNotice = transaction
    ? getDeclinedRequestNotice({ isBuyer, status: transaction.status })
    : null;
  const revieweeId = isSeller ? conversation.buyer_id : conversation.seller_id;

  return (
    <Card className="border-border/70">
      <CardContent className="flex h-full flex-col p-0">
        <div className="border-b border-border/70 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {conversation.listing?.title ?? "Conversation"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Chatting with{" "}
                {otherParticipant?.username ? (
                  <Link
                    href={`/profile/${otherParticipant.username}`}
                    className="underline underline-offset-2 transition-colors hover:text-foreground"
                  >
                    {otherParticipantName}
                  </Link>
                ) : (
                  otherParticipantName
                )}
                {otherParticipant?.university ? ` • ${otherParticipant.university}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {conversation.listing ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/listings/${conversation.listing.id}`}>
                    View listing
                  </Link>
                </Button>
              ) : null}
              <ReportButton
                targetKind="conversation"
                targetId={conversation.id}
                label="Report conversation"
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-[32rem] flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {transaction ? (
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      {isTrade ? "Trade request" : "Buy request"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.status === "pending" && !transaction.reservation_confirmed_at
                        ? "Waiting for seller response"
                        : transaction.status === "pending"
                          ? "Accepted"
                          : transaction.status}
                    </p>
                  </div>
                  {requestIsPending && isSeller ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        disabled={!!isActing}
                        onClick={() => void handleTransactionAction("accept")}
                        size="sm"
                        type="button"
                      >
                        {isActing === "accept" ? "Accepting..." : "Accept"}
                      </Button>
                      <Button
                        disabled={!!isActing}
                        onClick={() => void handleTransactionAction("decline")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {isActing === "decline" ? "Declining..." : "Decline"}
                      </Button>
                    </div>
                  ) : null}
                </div>

                {transaction.request_message ? (
                  <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border/70 bg-background p-3 text-sm">
                    {transaction.request_message}
                  </p>
                ) : null}

                {transaction.offered_listing ? (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/70 bg-background p-3">
                    <div className="h-12 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">
                      {transaction.offered_listing.primary_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={transaction.offered_listing.title}
                          className="h-full w-full object-cover"
                          src={transaction.offered_listing.primary_image_url}
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Offered listing
                      </p>
                      <Link
                        className="truncate text-sm font-medium underline underline-offset-2"
                        href={`/listings/${transaction.offered_listing.id}`}
                      >
                        {transaction.offered_listing.title}
                      </Link>
                    </div>
                  </div>
                ) : null}

                {requestIsPending && !isSeller ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    You cannot send follow-up messages until the seller accepts.
                  </p>
                ) : null}

                {declinedNotice ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {declinedNotice}
                  </p>
                ) : null}

                {transactionIsAccepted || transaction.status === "completed" ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    {sellerCanRequestPayment ? (
                      <Button
                        disabled={!!isActing}
                        onClick={() => void handleTransactionAction("request_payment")}
                        size="sm"
                        type="button"
                      >
                        {isActing === "request_payment" ? "Requesting..." : "Request payment"}
                      </Button>
                    ) : null}
                    {buyerCanPay ? <PayTransactionButton transactionId={transaction.id} /> : null}
                    {isBuyer && !isTrade && transactionIsAccepted && !transaction.payment_requested_at ? (
                      <p className="text-xs text-muted-foreground">
                        The seller will request payment when they are ready.
                      </p>
                    ) : null}
                    {isSeller && !isTrade && transaction.payment_status === "paid" ? (
                      <p className="text-xs text-muted-foreground">
                        Payment received. You can mark this transaction completed.
                      </p>
                    ) : null}
                    {isSeller && !isTrade && transaction.payment_status !== "paid" && transaction.payment_requested_at ? (
                      <p className="text-xs text-muted-foreground">
                        Waiting for buyer payment before completion.
                      </p>
                    ) : null}
                    {isSeller && canComplete ? (
                      <Button
                        disabled={!!isActing}
                        onClick={() => void handleTransactionAction("complete")}
                        size="sm"
                        type="button"
                      >
                        {isActing === "complete" ? "Completing..." : "Mark completed"}
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <Button
                        disabled={!!isActing}
                        onClick={() => void handleTransactionAction("cancel")}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {isActing === "cancel" ? "Cancelling..." : "Cancel transaction"}
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {transactionIsReviewable ? (
                  <div className="mt-4 border-t border-border/70 pt-4">
                    <ReviewForm
                      existingReview={conversation.viewerReview}
                      revieweeId={revieweeId}
                      reviewerRole={isSeller ? "seller" : "buyer"}
                      transactionId={transaction.id}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {conversation.messages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/30 p-6 text-sm text-muted-foreground">
                No messages yet. Start the conversation with a text message.
              </div>
            ) : (
              conversation.messages.map((message) => {
                const isOwnMessage = message.sender_id === viewerId;
                const senderName = getParticipantDisplayName(message.sender);

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      isOwnMessage ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] space-y-2 rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%]",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "border border-border/70 bg-secondary/40 text-foreground",
                      )}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p
                          className={cn(
                            "text-xs font-medium",
                            isOwnMessage
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground",
                          )}
                        >
                          {isOwnMessage ? "You" : senderName}
                        </p>
                        <p
                          className={cn(
                            "text-[11px]",
                            isOwnMessage
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.content}
                      </p>
                      <div className="flex items-center justify-between gap-2">
                        {isOwnMessage && message.is_read ? (
                          <p className="text-[11px] text-primary-foreground/75">
                            Seen
                          </p>
                        ) : <span />}
                        {!isOwnMessage ? (
                          <ReportButton
                            targetKind="message"
                            targetId={message.id}
                            label="Report"
                            className="!text-[11px]"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border/70 px-6 py-5">
            {chatCanSend ? (
              <div className="space-y-3">
                <Textarea
                  maxLength={MAX_MESSAGE_LENGTH}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Write a message. Press Enter to send, Shift+Enter for a new line."
                  value={draft}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Text only. Attachments and media uploads are disabled for conversations.
                    </p>
                    {error ? (
                      <p className="text-xs text-destructive">{error}</p>
                    ) : null}
                  </div>
                  <Button
                    disabled={isSending || draft.trim().length === 0}
                    onClick={() => void handleSendMessage()}
                    type="button"
                  >
                    {isSending ? "Sending..." : "Send message"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Conversation is read-only
                </p>
                <p className="text-xs text-muted-foreground">
                  Chat opens after seller acceptance and closes when the conversation is archived.
                </p>
                {error ? (
                  <p className="text-xs text-destructive">{error}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
