import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AccountSecurityForm } from "@/components/account-security-form";
import { EditProfileForm } from "@/components/edit-profile-form";
import { PillButton } from "@/components/ui/pill-button";
import { getDegreeOptions, getUniversityOptions, getViewerContext } from "@/lib/marketplace";

type ProfileEditContentProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function ProfileEditContent({ searchParams }: ProfileEditContentProps) {
  const { user, profile } = await getViewerContext();

  if (!user) {
    redirect("/auth/login");
  }

  const params = await searchParams;
  const isCompletionRequired = params.complete === "1";
  const [degrees, universities] = await Promise.all([
    getDegreeOptions(),
    getUniversityOptions(true),
  ]);

  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Profile
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Edit your profile
          </h1>
          <p className="text-sm text-muted-foreground">
            {isCompletionRequired
              ? "Add your academic details so Acadex can show relevant listings."
              : "Update your public details and account security settings."}
          </p>
        </div>

        {profile?.username ? (
          <PillButton asChild size="sm" variant="secondary">
            <Link href={`/profile/${profile.username}`}>View profile</Link>
          </PillButton>
        ) : null}
      </div>

      <EditProfileForm
        degrees={degrees}
        isCompletionRequired={isCompletionRequired}
        key={profile?.id}
        profile={profile}
        universities={universities}
      />
      <AccountSecurityForm email={user.email ?? profile?.email ?? ""} />
    </section>
  );
}

function ProfileEditFallback() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Edit your profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Loading account settings...
        </p>
      </div>

      <div className="h-64 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="h-80 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}

export default function ProfileEditPage({ searchParams }: ProfileEditContentProps) {
  return (
    <Suspense fallback={<ProfileEditFallback />}>
      <ProfileEditContent searchParams={searchParams} />
    </Suspense>
  );
}
