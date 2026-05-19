import { BrandTitle } from "@/components/brand-title";
import { SiteHeader } from "@/components/site-header";
import { ThemePicker } from "@/components/theme-picker";
import { getViewerContext } from "@/lib/marketplace";
import { isProfileComplete } from "@/lib/profile-completion";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-16">
        <Link href="/" className="inline-flex items-center">
          <BrandTitle priority />
        </Link>
        <ThemePicker />
      </div>
    </header>
  );
}

function MainFallback() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-12">
      <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </main>
  );
}

async function ProfileCompletionGate({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [requestHeaders, { profile }] = await Promise.all([
    headers(),
    getViewerContext(),
  ]);
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const isCompletingProfile = pathname.startsWith("/profile/edit");

  if (profile && !isProfileComplete(profile) && !isCompletingProfile) {
    redirect("/profile/edit?complete=1");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-12">
      {children}
    </main>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <Suspense fallback={<MainFallback />}>
        <ProfileCompletionGate>{children}</ProfileCompletionGate>
      </Suspense>
    </div>
  );
}
