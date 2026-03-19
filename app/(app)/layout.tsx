import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { Suspense } from "react";

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Acadex
        </Link>
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
