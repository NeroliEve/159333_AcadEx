import { SiteHeader } from "@/components/site-header";
import { PillButton } from "@/components/ui/pill-button";
import Link from "next/link";
import { Suspense } from "react";

const featureItems = [
  "Secure student marketplace",
  "Admin moderation",
  "Save money on course materials",
];

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-background">
      <div className="h-16 w-full animate-pulse bg-muted/40" />
    </header>
  );
}

function CheckBadge() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1F5EE4]">
      <svg
        aria-hidden="true"
        className="h-2.5 w-2.5"
        viewBox="0 0 10 8"
        fill="none"
      >
        <path
          d="M1 4L3.8 7L9 1"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function LandingContent() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:py-14">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center">
        <h1 className="max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          The student marketplace for textbooks and study books
        </h1>

        <p className="max-w-3xl text-base leading-7 text-foreground/80 sm:text-lg">
          Find affordable uni books, list the ones you no longer need, and exchange with students in your area.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-base text-foreground/90">
          {featureItems.map((item) => (
            <div key={item} className="inline-flex items-center gap-2">
              <CheckBadge />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <PillButton asChild size="sm" className="px-5 text-base font-semibold">
            <Link href="/auth/sign-up">Join for free →</Link>
          </PillButton>
          <p className="text-sm text-muted-foreground">
            Already a member?{" "}
            <Link href="/auth/login" className="font-semibold text-[#1F5EE4]">
              Sign in
            </Link>{" "}
            instead.
          </p>
        </div>
      </section>

      <section className="w-full">
        <div className="mx-auto drop-shadow-lg flex min-h-[420px] w-full max-w-6xl items-center justify-center rounded-2xl border border-border bg-card/40 px-6 py-10 sm:min-h-[460px]">
          <p className="text-center text-4xl font-bold tracking-tight text-foreground">
            preview of platform goes here
          </p>
        </div>
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>

      <LandingContent />
    </div>
  );
}


