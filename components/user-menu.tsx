"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type UserMenuProps = {
  avatarUrl?: string | null;
  email?: string | null;
  initialUnreadCount?: number;
  isSuspended?: boolean;
  name?: string | null;
};

function getInitial(name?: string | null, email?: string | null) {
  return (name?.trim().charAt(0) || email?.trim().charAt(0) || "A").toUpperCase();
}

function formatUnreadCount(count: number) {
  return count > 99 ? "99+" : count.toString();
}

export function UserMenu({
  avatarUrl,
  email,
  initialUnreadCount = 0,
  isSuspended = false,
  name,
}: UserMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

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
    if (isSuspended) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;
    const supabase = createClient();
    const channel = supabase
      .channel(`user-menu-unread-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void refreshUnreadCount();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => {
          void refreshUnreadCount();
        },
      )
      .subscribe();

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

    void refreshUnreadCount();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [isSuspended]);

  useEffect(() => {
    if (isSuspended) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

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

    void refreshUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isSuspended, pathname]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
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
            ) : null}
            <Link
              href="/profile"
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              onClick={() => setIsOpen(false)}
            >
              View profile
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
