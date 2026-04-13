import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EditListingForm } from "@/components/edit-listing-form";
import {
  getCourseOptions,
  getListingById,
  getViewerContext,
} from "@/lib/marketplace";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditListingPageFallback />}>
      <EditListingPageContent params={params} />
    </Suspense>
  );
}

async function EditListingPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, profile } = await getViewerContext();

  if (!user) redirect("/auth/login");

  const [{ listing, error }, courses] = await Promise.all([
    getListingById(id),
    getCourseOptions(),
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
      <EditListingForm listing={listing} courses={courses} />
    </section>
  );
}

function EditListingPageFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-[640px] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}
