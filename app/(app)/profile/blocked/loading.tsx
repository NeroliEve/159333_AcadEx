export default function BlockedUsersLoading() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">Loading blocked users</p>
      <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}
