export default function ProfileLoading() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">Loading profile</p>
      <div className="h-40 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
        <div className="h-32 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      </div>
    </section>
  );
}
