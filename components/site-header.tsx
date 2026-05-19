import Link from "next/link";
import Image from "next/image";

import { AuthenticatedHeaderNav } from "@/components/authenticated-header-nav";
import { BrandTitle } from "@/components/brand-title";
import { ThemePicker } from "@/components/theme-picker";
import { PillButton } from "@/components/ui/pill-button";
import { isMarketplaceSuspended } from "@/lib/admin";
import { getProfileDisplayName, getViewerContext } from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

type SiteHeaderProps = {
  showAdminBackButton?: boolean;
  viewerContextPromise?: Promise<Awaited<ReturnType<typeof getViewerContext>>>;
};

export async function SiteHeader({
  showAdminBackButton = false,
  viewerContextPromise,
}: SiteHeaderProps = {}) {
  let isAdmin = false;
  let isSuspended = false;
  let userAvatarUrl: string | null | undefined;
  let userEmail: string | undefined;
  let userId: string | undefined;
  let userName: string | undefined;

  if (hasEnvVars) {
    const { profile, user } = viewerContextPromise
      ? await viewerContextPromise
      : await getViewerContext();
    isSuspended = isMarketplaceSuspended(profile);
    isAdmin = profile?.role === "admin" && !isSuspended;
    userAvatarUrl = profile?.avatar_url;
    userEmail = user?.email ?? profile?.email ?? undefined;
    userId = user?.id;
    userName = profile ? getProfileDisplayName(profile, user?.email) : userEmail;
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="flex min-h-16 w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-16">
        <Link href="/" className="inline-flex shrink-0 items-center" aria-label="Acadex home">
          <Image
            src="/acadex-icon.svg"
            alt=""
            width={40}
            height={40}
            priority
            className="h-9 w-9 sm:hidden"
          />
          <BrandTitle priority className="hidden h-8 w-auto sm:block" />
        </Link>
        {userEmail ? (
          <AuthenticatedHeaderNav
            avatarUrl={userAvatarUrl}
            email={userEmail}
            isAdmin={isAdmin}
            isSuspended={isSuspended}
            name={userName}
            showAdminBackButton={showAdminBackButton}
            userId={userId}
          />
        ) : null}

        {!hasEnvVars ? (
          <p className="text-sm text-muted-foreground">
            Add Supabase env vars to enable auth.
          </p>
        ) : userEmail ? (
          null
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


