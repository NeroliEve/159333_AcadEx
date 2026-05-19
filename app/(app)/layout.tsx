import { BrandTitle } from "@/components/brand-title";
import { SiteHeader } from "@/components/site-header";
import { ThemePicker } from "@/components/theme-picker";
import { getViewerContext } from "@/lib/marketplace";
import { isProfileComplete } from "@/lib/profile-completion";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

type ViewerContext = Awaited<ReturnType<typeof getViewerContext>>;

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-16">
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
    <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </main>
  );
}

async function ProfileCompletionGate({
  children,
  viewerContextPromise,
}: Readonly<{
  children: React.ReactNode;
  viewerContextPromise: Promise<ViewerContext>;
}>) {
  const [requestHeaders, { profile }] = await Promise.all([
    headers(),
    viewerContextPromise,
  ]);
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const isCompletingProfile = pathname.startsWith("/profile/edit");

  if (profile && !isProfileComplete(profile) && !isCompletingProfile) {
    redirect("/profile/edit?complete=1");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      {children}
    </main>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewerContextPromise = getViewerContext();

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader viewerContextPromise={viewerContextPromise} />
      </Suspense>
      <Suspense fallback={<MainFallback />}>
        <ProfileCompletionGate viewerContextPromise={viewerContextPromise}>
          {children}
        </ProfileCompletionGate>
      </Suspense>
    </div>
  );
}
