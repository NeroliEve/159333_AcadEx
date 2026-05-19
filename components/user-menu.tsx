"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  formatHeaderNotificationCount,
  getHeaderMessageRealtimeFilters,
  getHeaderTransactionRealtimeFilters,
} from "@/components/header-notifications";
import { createClient } from "@/lib/supabase/client";

type UserMenuProps = {
  avatarUrl?: string | null;
  email?: string | null;
  isSuspended?: boolean;
  name?: string | null;
  unreadCount?: number;
  unseenTransactionCount?: number;
  userId?: string | null;
};

function getInitial(name?: string | null, email?: string | null) {
  return (name?.trim().charAt(0) || email?.trim().charAt(0) || "A").toUpperCase();
}

export const getUserMenuTransactionRealtimeFilters =
  getHeaderTransactionRealtimeFilters;
export const getUserMenuMessageRealtimeFilters = getHeaderMessageRealtimeFilters;

export function UserMenu({
  avatarUrl,
  email,
  isSuspended = false,
  name,
  unreadCount = 0,
  unseenTransactionCount = 0,
}: UserMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

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
            {formatHeaderNotificationCount(unreadCount)}
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
                      {formatHeaderNotificationCount(unreadCount)}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/profile/transactions"
                  className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  onClick={() => setIsOpen(false)}
                >
                  <span>Transactions</span>
                  {unseenTransactionCount > 0 ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                      {formatHeaderNotificationCount(unseenTransactionCount)}
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
