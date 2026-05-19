"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AdminDashboardPill } from "@/components/admin-dashboard-pill";
import { GoBackButton } from "@/components/go-back-button";
import {
  formatHeaderNotificationCount,
  useHeaderNotificationCounts,
} from "@/components/header-notifications";
import { ThemePicker } from "@/components/theme-picker";
import { UserMenu } from "@/components/user-menu";
import { PillButton } from "@/components/ui/pill-button";
import { cn } from "@/lib/utils";

type AuthenticatedHeaderNavProps = {
  avatarUrl?: string | null;
  email: string;
  initialUnreadCount?: number;
  initialUnseenTransactionCount?: number;
  isAdmin: boolean;
  isSuspended: boolean;
  name?: string | null;
  showAdminBackButton: boolean;
  userId?: string | null;
};

type HeaderNavLinksProps = {
  className?: string;
  onNavigate?: () => void;
  unreadCount?: number;
  variant?: "desktop" | "mobile";
};

type HeaderNavLink = {
  hasUnreadBadge?: boolean;
  href: string;
  label: string;
};

const navLinks: HeaderNavLink[] = [
  { href: "/home", label: "Home" },
  { href: "/browse", label: "Browse" },
  { href: "/profile/saved", label: "Saved" },
  { href: "/profile/transactions", label: "Transactions" },
  { href: "/messages", label: "Messages", hasUnreadBadge: true },
] as const;

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
      {formatHeaderNotificationCount(count)}
    </span>
  );
}

export function HeaderNavLinks({
  className,
  onNavigate,
  unreadCount = 0,
  variant = "desktop",
}: HeaderNavLinksProps) {
  const isMobile = variant === "mobile";

  return (
    <nav
      aria-label={isMobile ? "Mobile primary navigation" : "Primary navigation"}
      className={cn(
        isMobile
          ? "grid gap-1"
          : "hidden items-center gap-4 text-sm text-muted-foreground lg:flex",
        className,
      )}
    >
      {navLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "transition-colors hover:text-foreground",
            isMobile
              ? "flex items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
              : "inline-flex items-center gap-1.5",
          )}
          onClick={onNavigate}
        >
          <span>{link.label}</span>
          {link.hasUnreadBadge ? (
            <NotificationBadge count={unreadCount} />
          ) : null}
        </Link>
      ))}
      <PillButton asChild size="sm" className={isMobile ? "mt-1 justify-center" : undefined}>
        <Link href="/listings/new" onClick={onNavigate}>
          Create listing
        </Link>
      </PillButton>
    </nav>
  );
}

export function AuthenticatedHeaderNav({
  avatarUrl,
  email,
  initialUnreadCount = 0,
  initialUnseenTransactionCount = 0,
  isAdmin,
  isSuspended,
  name,
  showAdminBackButton,
  userId,
}: AuthenticatedHeaderNavProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { unreadCount, unseenTransactionCount } = useHeaderNotificationCounts({
    initialUnreadCount,
    initialUnseenTransactionCount,
    isSuspended,
    userId,
  });

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  if (isSuspended) {
    return (
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
        <span className="hidden rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 sm:inline-flex">
          Marketplace access suspended
        </span>
        {isAdmin ? (
          showAdminBackButton ? (
            <GoBackButton />
          ) : (
            <AdminDashboardPill />
          )
        ) : null}
        <ThemePicker />
        <UserMenu
          avatarUrl={avatarUrl}
          email={email}
          isSuspended={isSuspended}
          name={name}
          userId={userId}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-4 lg:justify-between">
      <HeaderNavLinks unreadCount={unreadCount} />
      <div className="flex items-center gap-2 sm:gap-3">
        <div ref={menuRef} className="relative lg:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-haspopup="menu"
            className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
          >
            Menu
          </button>

          {isMobileMenuOpen ? (
            <div
              role="menu"
              aria-label="Primary navigation"
              className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border/70 bg-background p-2 shadow-lg"
            >
              <HeaderNavLinks
                unreadCount={unreadCount}
                variant="mobile"
                onNavigate={() => setIsMobileMenuOpen(false)}
              />
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          showAdminBackButton ? (
            <GoBackButton />
          ) : (
            <AdminDashboardPill />
          )
        ) : null}
        <ThemePicker />
        <UserMenu
          avatarUrl={avatarUrl}
          email={email}
          isSuspended={isSuspended}
          name={name}
          unreadCount={unreadCount}
          unseenTransactionCount={unseenTransactionCount}
          userId={userId}
        />
      </div>
    </div>
  );
}
