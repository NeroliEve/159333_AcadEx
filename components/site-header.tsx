import Link from "next/link";

import { AdminDashboardPill } from "@/components/admin-dashboard-pill";
import { BrandTitle } from "@/components/brand-title";
import { GoBackButton } from "@/components/go-back-button";
import { ThemePicker } from "@/components/theme-picker";
import { UserMenu } from "@/components/user-menu";
import { PillButton } from "@/components/ui/pill-button";
import { createClient } from "@/lib/supabase/server";
import { isMarketplaceSuspended } from "@/lib/admin";
import { getUnreadMessageCount } from "@/lib/messages";
import { getProfileDisplayName, getViewerContext } from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

type SiteHeaderProps = {
  showAdminBackButton?: boolean;
};

export async function SiteHeader({
  showAdminBackButton = false,
}: SiteHeaderProps = {}) {
  let isAdmin = false;
  let isSuspended = false;
  let userAvatarUrl: string | null | undefined;
  let userEmail: string | undefined;
  let userName: string | undefined;
  let unreadMessageCount = 0;
  let unseenTransactionCount = 0;
  let pendingReportCount = 0;

  if (hasEnvVars) {
    const { profile, user } = await getViewerContext();
    isSuspended = isMarketplaceSuspended(profile);
    isAdmin = profile?.role === "admin" && !isSuspended;
    userAvatarUrl = profile?.avatar_url;
    userEmail = user?.email ?? profile?.email ?? undefined;
    userName = profile ? getProfileDisplayName(profile, user?.email) : userEmail;
    unreadMessageCount = user && !isSuspended ? await getUnreadMessageCount(user.id) : 0;

    if (user && !isSuspended) {
      const supabase = await createClient();
      const seenAt = profile?.transactions_seen_at ?? "1970-01-01T00:00:00Z";
      const { count: txCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .gt("updated_at", seenAt);
      unseenTransactionCount = txCount ?? 0;

      if (isAdmin) {
        const { count } = await supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");
        pendingReportCount = count ?? 0;
      }
    }
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-16">
        <div className="flex items-center gap-6">
          <Link href="/" className="inline-flex items-center">
            <BrandTitle priority />
          </Link>
          {userEmail ? (
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
              <Link
                href="/home"
                className="transition-colors hover:text-foreground"
              >
                Home
              </Link>
              {!isSuspended ? (
                <>
                  <Link
                    href="/messages"
                    className="transition-colors hover:text-foreground"
                  >
                    Messages
                  </Link>
                  <PillButton asChild size="sm">
                    <Link href="/listings/new">Create listing</Link>
                  </PillButton>
                </>
              ) : (
                <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                  Marketplace access suspended
                </span>
              )}
            </nav>
          ) : null}
        </div>

        {!hasEnvVars ? (
          <p className="text-sm text-muted-foreground">
            Add Supabase env vars to enable auth.
          </p>
        ) : userEmail ? (
          <div className="flex items-center gap-3">
            {isAdmin ? (
              showAdminBackButton ? (
                <GoBackButton />
              ) : (
                <AdminDashboardPill initialPendingReportCount={pendingReportCount} />
              )
            ) : null}
            <ThemePicker />
            <UserMenu
              avatarUrl={userAvatarUrl}
              email={userEmail}
              initialUnreadCount={unreadMessageCount}
              initialUnseenTransactionCount={unseenTransactionCount}
              isSuspended={isSuspended}
              name={userName}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ThemePicker />
            <PillButton asChild size="sm" variant="secondary">
              <Link href="/auth/login">Sign in</Link>
            </PillButton>
            <PillButton asChild size="sm">
              <Link href="/auth/sign-up">Sign up</Link>
            </PillButton>
          </div>
        )}
      </div>
    </header>
  );
}


