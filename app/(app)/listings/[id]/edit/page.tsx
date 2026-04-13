import { redirect } from "next/navigation";

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
