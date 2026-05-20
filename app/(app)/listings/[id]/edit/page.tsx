import { redirect } from "next/navigation";
import { Suspense } from "react";

import { isMarketplaceSuspended } from "@/lib/admin";
import { EditListingForm } from "@/components/edit-listing-form";
import { EmptyState } from "@/components/empty-state";
import {
  getCourseOptions,
  getListingById,
  getStudyAreaOptions,
  getViewerContext,
} from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

async function EditListingPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await getViewerContext();

  if (!user) redirect("/auth/login");

  if (isMarketplaceSuspended(profile)) {
    return (
      <EmptyState
        actionHref="/home"
        actionLabel="Back to home"
        description="Your account is currently suspended from marketplace activity, so listings cannot be edited."
        eyebrow="Edit listing"
        title="Listing editing is disabled"
      />
    );
  }

  const [{ listing, error }, courses, studyAreas] = await Promise.all([
    getListingById(id, {
      bypassBlock: profile?.role === "admin",
      viewerId: user.id,
    }),
    getCourseOptions(),
    getStudyAreaOptions(),
  ]);

  if (error || !listing) redirect("/home");

  const isOwner = listing.seller_id === user.id;
  const isAdmin = profile?.role === "admin";

  if (!isOwner && !isAdmin) redirect("/home");

  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Edit listing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Update your listing
        </h1>
      </div>
      <EditListingForm listing={listing} courses={courses} studyAreas={studyAreas} />
    </section>
  );
}

function EditListingPageFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Edit listing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Update your listing
        </h1>
        <p className="text-sm text-muted-foreground">Loading listing editor...</p>
      </div>
      <div className="h-[720px] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasEnvVars) {
    return (
      <EmptyState
        description="Add your Supabase environment variables before editing listings."
        eyebrow="Edit listing"
        title="Supabase setup is still missing"
      />
    );
  }

  return (
    <Suspense fallback={<EditListingPageFallback />}>
      <EditListingPageContent params={params} />
    </Suspense>
  );
}
