import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getViewerContext } from "@/lib/marketplace";

async function ProfileRedirect() {
  const { user, profile } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  if (profile?.username) {
    redirect(`/profile/${profile.username}`);
  }

  redirect("/profile/edit");
  return null;
}

function ProfileRedirectFallback() {
  return (
    <section className="flex flex-col gap-4">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Profile
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Loading profile...</h1>
      <p className="text-sm text-muted-foreground">
        Opening your public profile or account editor.
      </p>
    </section>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileRedirectFallback />}>
      <ProfileRedirect />
    </Suspense>
  );
}
