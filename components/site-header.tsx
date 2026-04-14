import Link from "next/link";

import { BrandTitle } from "@/components/brand-title";
import { LogoutButton } from "@/components/logout-button";
import { ThemePicker } from "@/components/theme-picker";
import { PillButton } from "@/components/ui/pill-button";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

export async function SiteHeader() {
  let userEmail: string | undefined;

  if (hasEnvVars) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userEmail = data?.claims.email;
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
              <Link
                href="/listings/new"
                className="transition-colors hover:text-foreground"
              >
                Create listing
              </Link>
              <Link
                href="/profile"
                className="transition-colors hover:text-foreground"
              >
                Profile
              </Link>
            </nav>
          ) : null}
        </div>

        {!hasEnvVars ? (
          <p className="text-sm text-muted-foreground">
            Add Supabase env vars to enable auth.
          </p>
        ) : userEmail ? (
          <div className="flex items-center gap-3">
            <ThemePicker />
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
            <LogoutButton />
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


