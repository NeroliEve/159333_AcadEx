"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type UserMenuProps = {
  avatarUrl?: string | null;
  email?: string | null;
  initialUnreadCount?: number;
  initialUnseenTransactionCount?: number;
  isSuspended?: boolean;
  name?: string | null;
  userId?: string | null;
};

type UserMenuRealtimeFilter = {
  event: "INSERT" | "UPDATE";
  filter: string;
  schema: "public";
  table: "conversations" | "messages" | "profiles" | "transactions";
};

function getInitial(name?: string | null, email?: string | null) {
  return (name?.trim().charAt(0) || email?.trim().charAt(0) || "A").toUpperCase();
}

function formatUnreadCount(count: number) {
  return count > 99 ? "99+" : count.toString();
}

export function getUserMenuTransactionRealtimeFilters(
  userId: string,
): UserMenuRealtimeFilter[] {
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

export function getUserMenuMessageRealtimeFilters(
  userId: string,
): UserMenuRealtimeFilter[] {
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

export function UserMenu({
  avatarUrl,
  email,
  initialUnreadCount = 0,
  initialUnseenTransactionCount = 0,
  isSuspended = false,
  name,
  userId,
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [unseenTxCount, setUnseenTxCount] = useState(initialUnseenTransactionCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    setUnseenTxCount(initialUnseenTransactionCount);
  }, [initialUnseenTransactionCount]);

  useEffect(() => {
    if (isSuspended || !userId) {
      setUnseenTxCount(0);
      return;
    }
    let isMounted = true;
    const supabase = createClient();
    const channel = supabase.channel(`user-menu-transactions-${userId}`);

    async function refreshTxCount() {
      try {
        const response = await fetch("/api/transactions/unseen-count", { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 401 && isMounted) setUnseenTxCount(0);
          return;
        }
        const data = (await response.json()) as { count?: number };
        if (isMounted) setUnseenTxCount(typeof data.count === "number" ? data.count : 0);
      } catch {
        if (isMounted) setUnseenTxCount(0);
      }
    }

    for (const filter of getUserMenuTransactionRealtimeFilters(userId)) {
      channel.on("postgres_changes", filter, () => {
        void refreshTxCount();
      });
    }

    channel.subscribe();
    void refreshTxCount();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [isSuspended, userId]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (isSuspended || !userId) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;
    const supabase = createClient();
    const channel = supabase.channel(`user-menu-unread-${userId}`);

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

    for (const filter of getUserMenuMessageRealtimeFilters(userId)) {
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

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Full reload clears Next.js router cache so cached RSC from the
    // previous user can't leak into the next session.
    window.location.href = "/";
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-secondary text-sm font-semibold text-secondary-foreground transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onClick={() => setIsOpen((current) => !current)}
      >
        {avatarUrl ? (
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt=""
              className="h-full w-full object-cover"
              src={avatarUrl}
            />
          </span>
        ) : (
          <span>{getInitial(name, email)}</span>
        )}
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {formatUnreadCount(unreadCount)}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-border/70 bg-background p-2 shadow-lg">
          <div className="border-b border-border/70 px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {name || "Your account"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {email || "Email unavailable"}
            </p>
            {isSuspended ? (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Marketplace access is suspended.
              </p>
            ) : null}
          </div>

          <div className="grid gap-1 pt-2">
            {!isSuspended ? (
              <>
                <Link
                  href="/messages"
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <span>Messages</span>
                  {unreadCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {formatUnreadCount(unreadCount)}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/profile/transactions"
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <span>Transactions</span>
                  {unseenTxCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {formatUnreadCount(unseenTxCount)}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/profile/wallet"
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  Wallet
                </Link>
              </>
            ) : null}
            <Link
              href="/profile"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              View profile
            </Link>
            <Link
              href="/profile/reports"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              My reports
            </Link>
            <Link
              href="/profile/blocked"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              Blocked users
            </Link>
            <button
              type="button"
              className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
