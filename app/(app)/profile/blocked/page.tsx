import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BlockUserButton } from "@/components/block-user-button";
import { getViewerContext } from "@/lib/marketplace";
import { getBlockedUsers } from "@/lib/reports-server";

function nameOrUsername(p: { first_name?: string | null; last_name?: string | null; username?: string | null }) {
  const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return full || p.username || "User";
}

async function BlockedUsersContent() {
  const { user } = await getViewerContext();
  if (!user) redirect("/auth/login");

  const blocks = await getBlockedUsers(user.id);

  return (
    <section className="flex flex-col gap-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
        <h1 className="text-3xl font-semibold tracking-tight">Blocked users</h1>
        <p className="text-sm text-muted-foreground">
          Blocked users can&apos;t message you and won&apos;t appear in your listings feed.
        </p>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          You haven&apos;t blocked anyone.
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((entry) => {
            const profile = entry.profile;
            if (!profile) return null;
            const displayName = nameOrUsername(profile);
            return (
              <div
                key={entry.blocked_id}
                className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3 self-stretch sm:self-auto">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary/40">
                    {profile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={profile.avatar_url} />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${profile.username}`}
                      className="block truncate text-sm font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                    >
                      {displayName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Blocked{" "}
                      {new Date(entry.created_at).toLocaleDateString("en-NZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <BlockUserButton userId={profile.id} initiallyBlocked={true} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BlockedUsersFallback() {
  return (
    <section className="flex flex-col gap-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
        <h1 className="text-3xl font-semibold tracking-tight">Blocked users</h1>
        <p className="text-sm text-muted-foreground">
          Blocked users can&apos;t message you and won&apos;t appear in your listings feed.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">Loading blocked users...</p>
      <div className="h-32 animate-pulse rounded-xl bg-muted/40" />
    </section>
  );
}

export default function BlockedUsersPage() {
  return (
    <Suspense fallback={<BlockedUsersFallback />}>
      <BlockedUsersContent />
    </Suspense>
  );
}
