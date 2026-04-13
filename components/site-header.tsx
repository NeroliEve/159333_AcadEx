import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
import { Button } from "@/components/ui/button";
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
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Acadex
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
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
            <LogoutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
