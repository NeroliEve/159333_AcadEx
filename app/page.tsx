import { SiteHeader } from "@/components/site-header";
import { getViewerContext } from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

const howItWorks = [
  {
    description: "Create a simple listing with price, condition, and any course details that matter.",
    title: "1. List your textbook",
  },
  {
    description: "Students can browse affordable used books without guessing what’s available.",
    title: "2. Get discovered fast",
  },
  {
    description: "Arrange pickup or handoff directly with another student at your university.",
    title: "3. Sell locally",
  },
];

const valueProps = [
  "Find affordable second-hand textbooks",
  "Sell books from past courses",
  "Connect with students at your university",
];

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Acadex
        </Link>
      </div>
    </header>
  );
}

async function LandingHeroActions() {
  const { user } = await getViewerContext();

  const primaryHref = user ? "/listings/new" : "/auth/sign-up";
  const primaryLabel = user ? "Create a listing" : "Get started";
  const secondaryHref = "/home";
  const secondaryLabel = user ? "Open app" : "Browse books";

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href={primaryHref}>{primaryLabel}</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={secondaryHref}>{secondaryLabel}</Link>
        </Button>
      </div>

      {!hasEnvVars ? (
        <p className="text-sm text-muted-foreground">
          Supabase environment variables still need to be configured before auth
          and listings will work.
        </p>
      ) : user ? (
        <p className="text-sm text-muted-foreground">
          You’re signed in. Go straight to the app or publish a book now.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Create an account to sell books, or browse the feed first.
        </p>
      )}
    </>
  );
}

function LandingHeroActionsFallback() {
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-4 w-72 animate-pulse rounded bg-muted" />
    </>
  );
}

export default function Home() {

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6 py-12 md:py-20">
        <section className="grid gap-10 rounded-3xl border border-border/70 bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--secondary)))] px-8 py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] md:px-12 md:py-16">
          <div className="space-y-6">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Student book exchange
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Buy and sell used university books without the usual hassle.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Acadex is a simple student marketplace for second-hand
                textbooks. Browse affordable books for your courses, or list the
                books you no longer need in a few minutes.
              </p>
            </div>

            <Suspense fallback={<LandingHeroActionsFallback />}>
              <LandingHeroActions />
            </Suspense>
          </div>

          <div className="grid gap-4 self-stretch">
            {valueProps.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border/70 bg-background/80 p-5"
              >
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Why Acadex
                </p>
                <p className="mt-3 text-lg font-medium leading-7">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
              How it works
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              A clean three-step flow for tonight’s MVP
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {howItWorks.map((step) => (
              <div
                key={step.title}
                className="rounded-2xl border border-border/70 bg-card p-6"
              >
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-border/70 bg-card px-8 py-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-10">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground">
              Start browsing
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Open the app and see what books are already listed.
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              The home feed is designed to stay useful even when the marketplace
              is still empty, so students immediately know what to do next.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/home">Open Acadex</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
