export default function ProfileLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Loading profile...</h1>
      </div>
      <div className="h-40 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-32 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
        <div className="h-32 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      </div>
    </section>
  );
}
