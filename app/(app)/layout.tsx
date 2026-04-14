import { BrandTitle } from "@/components/brand-title";
import { SiteHeader } from "@/components/site-header";
import { ThemePicker } from "@/components/theme-picker";
import Link from "next/link";
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

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-12">
        {children}
      </main>
    </div>
  );
}
