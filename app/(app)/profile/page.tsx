import { redirect } from "next/navigation";

import { EditProfileForm } from "@/components/edit-profile-form";
import { ListingCard } from "@/components/listing-card";
import { getMyListings, getViewerContext } from "@/lib/marketplace";

export default async function ProfilePage() {
  const { user, profile } = await getViewerContext();

  if (!user) redirect("/auth/login");

  const listings = await getMyListings(user.id);

  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Your account
        </h1>
      </div>

      <EditProfileForm profile={profile} />

      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            Your listings
          </h2>
          <p className="text-sm text-muted-foreground">
            All your listings across every status.
          </p>
        </div>

        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t listed any books yet.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                viewerId={profile?.id}
                viewerRole={profile?.role}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
