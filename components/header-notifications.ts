"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type HeaderRealtimeFilter = {
  event: "INSERT" | "UPDATE";
  filter: string;
  schema: "public";
  table: "conversations" | "messages" | "profiles" | "transactions";
};

type UseHeaderNotificationCountsOptions = {
  initialUnreadCount?: number;
  initialUnseenTransactionCount?: number;
  isSuspended?: boolean;
  userId?: string | null;
};

export function formatHeaderNotificationCount(count: number) {
  return count > 99 ? "99+" : count.toString();
}

export function getHeaderTransactionRealtimeFilters(
  userId: string,
): HeaderRealtimeFilter[] {
  return [
    {
      event: "INSERT",
      filter: `buyer_id=eq.${userId}`,
      schema: "public",
      table: "transactions",
    },
    {
      event: "UPDATE",
      filter: `buyer_id=eq.${userId}`,
      schema: "public",
      table: "transactions",
    },
    {
      event: "INSERT",
      filter: `seller_id=eq.${userId}`,
      schema: "public",
      table: "transactions",
    },
    {
      event: "UPDATE",
      filter: `seller_id=eq.${userId}`,
      schema: "public",
      table: "transactions",
    },
    {
      event: "UPDATE",
      filter: `id=eq.${userId}`,
      schema: "public",
      table: "profiles",
    },
  ];
}

export function getHeaderMessageRealtimeFilters(
  userId: string,
): HeaderRealtimeFilter[] {
  return [
    {
      event: "UPDATE",
      filter: `sender_id=neq.${userId}`,
      schema: "public",
      table: "messages",
    },
    {
      event: "INSERT",
      filter: `buyer_id=eq.${userId}`,
      schema: "public",
      table: "conversations",
    },
    {
      event: "UPDATE",
      filter: `buyer_id=eq.${userId}`,
      schema: "public",
      table: "conversations",
    },
    {
      event: "INSERT",
      filter: `seller_id=eq.${userId}`,
      schema: "public",
      table: "conversations",
    },
    {
      event: "UPDATE",
      filter: `seller_id=eq.${userId}`,
      schema: "public",
      table: "conversations",
    },
  ];
}

export function useHeaderNotificationCounts({
  initialUnreadCount = 0,
  initialUnseenTransactionCount = 0,
  isSuspended = false,
  userId,
}: UseHeaderNotificationCountsOptions) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [unseenTransactionCount, setUnseenTransactionCount] = useState(
    initialUnseenTransactionCount,
  );

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    setUnseenTransactionCount(initialUnseenTransactionCount);
  }, [initialUnseenTransactionCount]);

  useEffect(() => {
    if (isSuspended || !userId) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;
    const supabase = createClient();
    const channel = supabase.channel(`header-unread-${userId}`);

    async function refreshUnreadCount() {
      try {
        const response = await fetch("/api/messages/unread-count", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401 && isMounted) {
            setUnreadCount(0);
          }
          return;
        }

        const data = (await response.json()) as { count?: number };
        if (isMounted) {
          setUnreadCount(typeof data.count === "number" ? data.count : 0);
        }
      } catch {
        if (isMounted) {
          setUnreadCount(0);
        }
      }
    }

    for (const filter of getHeaderMessageRealtimeFilters(userId)) {
      channel.on("postgres_changes", filter, () => {
        void refreshUnreadCount();
      });
    }

    channel.subscribe();
    void refreshUnreadCount();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [isSuspended, userId]);

  useEffect(() => {
    if (isSuspended || !userId) {
      setUnseenTransactionCount(0);
      return;
    }

    let isMounted = true;
    const supabase = createClient();
    const channel = supabase.channel(`header-transactions-${userId}`);

    async function refreshTransactionCount() {
      try {
        const response = await fetch("/api/transactions/unseen-count", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 401 && isMounted) {
            setUnseenTransactionCount(0);
          }
          return;
        }

        const data = (await response.json()) as { count?: number };
        if (isMounted) {
          setUnseenTransactionCount(
            typeof data.count === "number" ? data.count : 0,
          );
        }
      } catch {
        if (isMounted) {
          setUnseenTransactionCount(0);
        }
      }
    }

    for (const filter of getHeaderTransactionRealtimeFilters(userId)) {
      channel.on("postgres_changes", filter, () => {
        void refreshTransactionCount();
      });
    }

    channel.subscribe();
    void refreshTransactionCount();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [isSuspended, userId]);

  return {
    unreadCount,
    unseenTransactionCount,
  };
}
