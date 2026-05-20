export default function AdminLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Admin moderation
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Loading admin dashboard...
        </p>
      </div>
      <div className="h-28 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="h-[32rem] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}
