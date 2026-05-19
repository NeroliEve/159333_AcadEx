import { SiteHeader } from "@/components/site-header";
import { PillButton } from "@/components/ui/pill-button";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

const featureItems = [
  "Secure student marketplace",
  "Admin moderation",
  "Save money on course materials",
];

type DecorativeAssetProps = {
  className: string;
  name: string;
  sizes: string;
};

function HeaderFallback() {
  return (
    <header className="border-b border-border bg-background">
      <div className="h-16 w-full animate-pulse bg-muted/40" />
    </header>
  );
}

function DecorativeAsset({ className, name, sizes }: DecorativeAssetProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    >
      <Image
        src={`/assets/${name}.png`}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        className="object-contain mix-blend-multiply dark:hidden"
      />
      <Image
        src={`/assets/${name}-dark.png`}
        alt=""
        fill
        sizes={sizes}
        unoptimized
        className="hidden object-contain mix-blend-screen dark:block"
      />
    </div>
  );
}

function LandingDecorations() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 hidden overflow-hidden xl:block"
    >
      <DecorativeAsset
        name="acadex-student"
        sizes="(min-width: 1536px) 384px, (min-width: 1280px) 320px, 0px"
        className="absolute left-[-4.5rem] top-[34vh] aspect-square w-80 rotate-[-8deg] 2xl:left-[3vw] 2xl:top-[31vh] 2xl:w-96"
      />
      <DecorativeAsset
        name="acadex-phone"
        sizes="(min-width: 1536px) 320px, (min-width: 1280px) 256px, 0px"
        className="absolute left-[-2.5rem] top-[68vh] aspect-square w-64 rotate-[5deg] 2xl:left-[7vw] 2xl:top-[69vh] 2xl:w-80"
      />
      <DecorativeAsset
        name="acadex-laptop"
        sizes="(min-width: 1536px) 384px, (min-width: 1280px) 320px, 0px"
        className="absolute right-[-5rem] top-[38vh] aspect-square w-80 rotate-[6deg] 2xl:right-[4vw] 2xl:top-[35vh] 2xl:w-96"
      />
      <DecorativeAsset
        name="acadex-exchange"
        sizes="(min-width: 1536px) 352px, (min-width: 1280px) 288px, 0px"
        className="absolute right-[-2.5rem] top-[72vh] aspect-square w-72 rotate-[-4deg] 2xl:right-[8vw] 2xl:top-[73vh] 2xl:w-88"
      />
    </div>
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

async function LandingContent() {
  let isSignedIn = false;

  if (hasEnvVars) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    isSignedIn = !!data.user;
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-14">
      <section className="relative isolate mx-auto flex min-h-[520px] w-full max-w-7xl items-center justify-center overflow-hidden text-center">
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-6">
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            The student marketplace for textbooks and study books
          </h1>

          <p className="max-w-3xl text-base leading-7 text-foreground/80 sm:text-lg">
            Find affordable uni books, list the ones you no longer need, and exchange with students near you.
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
          {isSignedIn ? (
            <PillButton asChild size="sm" className="px-5 text-base font-semibold">
              <Link href="/home">Continue to Acadex →</Link>
            </PillButton>
          ) : (
            <>
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
            </>
          )}
          </div>
        </div>
      </section>

      <section className="w-full">
        <div className="mx-auto flex min-h-[420px] w-full max-w-6xl items-center justify-center rounded-2xl border border-border bg-card/40 px-4 py-10 drop-shadow-lg sm:min-h-[460px] sm:px-6">
          <p className="text-center text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
            preview of platform goes here
          </p>
        </div>
      </section>
    </main>
  );
}

export default async function Home() {
  return (
    <div className="relative isolate min-h-screen bg-background dark:bg-black">
      <LandingDecorations />

      <div className="relative z-10">
        <Suspense fallback={<HeaderFallback />}>
          <SiteHeader />
        </Suspense>

        <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-6 py-10 animate-pulse" />}>
          <LandingContent />
        </Suspense>
      </div>
    </div>
  );
}
