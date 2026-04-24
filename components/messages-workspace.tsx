"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useMessagesContext } from "@/components/messages-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MESSAGE_LENGTH } from "@/lib/message-constants";
import type { ConversationDetail, ConversationMessage, ConversationSummary } from "@/lib/messages";
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

export function MessagesWorkspace({
  initialConversation,
  viewerId,
}: MessagesWorkspaceProps) {
  const { setSummaries, summaries } = useMessagesContext();
  const [conversation, setConversation] = useState(initialConversation);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
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

    setSummaries((currentSummaries) =>
      currentSummaries.map((summary) =>
        summary.id === conversation.id
          ? {
              ...summary,
              last_message_at: latestMessage?.created_at ?? summary.last_message_at,
              latestMessage,
              unreadCount,
            }
          : summary,
      ),
    );
  }, [conversation.id, conversation.messages, setSummaries, viewerId]);

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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation.buyer, conversation.buyer_id, conversation.id, conversation.seller, conversation.seller_id]);

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

  const activeSummary = summaries.find((summary) => summary.id === conversation.id) ?? {
    ...conversation,
    latestMessage: conversation.messages.at(-1) ?? null,
    otherParticipant:
      conversation.buyer_id === viewerId ? conversation.seller : conversation.buyer,
    unreadCount: 0,
  };

  const otherParticipant = activeSummary.otherParticipant;
  const otherParticipantName = getParticipantDisplayName(otherParticipant);

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
                Chatting with {otherParticipantName}
                {otherParticipant?.university ? ` • ${otherParticipant.university}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {conversation.listing ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/listings/${conversation.listing.id}`}>
                    View listing
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-[32rem] flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
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
                      {isOwnMessage && message.is_read ? (
                        <p className="text-[11px] text-primary-foreground/75">
                          Seen
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border/70 px-6 py-5">
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
