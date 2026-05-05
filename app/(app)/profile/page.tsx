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
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
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
