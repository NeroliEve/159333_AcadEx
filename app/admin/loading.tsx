export default function AdminLoading() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">Loading admin dashboard</p>
      <div className="h-28 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="h-[32rem] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}
