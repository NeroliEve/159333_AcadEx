export default function EditListingLoading() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">Loading listing editor</p>
      <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="h-[36rem] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}
