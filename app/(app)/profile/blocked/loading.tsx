export default function BlockedUsersLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
        <h1 className="text-3xl font-semibold tracking-tight">Blocked users</h1>
        <p className="text-sm text-muted-foreground">Loading blocked users...</p>
      </div>
      <div className="h-48 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}
