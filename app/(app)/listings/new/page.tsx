import Link from "next/link";

import { CreateListingForm } from "@/components/create-listing-form";
import { EmptyState } from "@/components/empty-state";
import { PillButton } from "@/components/ui/pill-button";
import { getCourseOptions, getStudyAreaOptions, getViewerContext } from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";
import { Suspense } from "react";

async function CreateListingPageContent() {
  const [{ profile, user }, courses, studyAreas] = await Promise.all([
    getViewerContext(),
    getCourseOptions(),
    getStudyAreaOptions(),
  ]);

  if (!user) {
    return (
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            Create listing
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in to list a book
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Students can browse the feed without logging in, but posting a book
            requires an Acadex account.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <PillButton asChild>
            <Link href="/auth/login">Sign in</Link>
          </PillButton>
          <PillButton asChild variant="secondary">
            <Link href="/auth/sign-up">Create account</Link>
          </PillButton>
          <PillButton asChild variant="secondary">
            <Link href="/home">Browse books</Link>
          </PillButton>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Create listing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Post a book for sale
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Add the essentials and publish quickly. Listings are currently focused
          on book sales, not trade flows.
        </p>
        <p className="text-sm text-muted-foreground">
          Selling as{" "}
          <span className="font-medium text-foreground">
            {profile?.university || user.email}
          </span>
        </p>
      </div>

      <CreateListingForm courses={courses} studyAreas={studyAreas} />
    </section>
  );
}

function CreateListingPageFallback() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-[640px] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}

export default function NewListingPage() {
  if (!hasEnvVars) {
    return (
      <EmptyState
        description="Add your Supabase environment variables before creating listings."
        eyebrow="Create Listing"
        title="Supabase setup is still missing"
      />
    );
  }

  return (
    <Suspense fallback={<CreateListingPageFallback />}>
      <CreateListingPageContent />
    </Suspense>
  );
}


