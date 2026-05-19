export default function ListingDetailLoading() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">Loading listing</p>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="aspect-[4/3] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
        <div className="h-96 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      </div>
    </section>
  );
}
