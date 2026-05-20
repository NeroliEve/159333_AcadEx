export default function ListingDetailLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Listing details
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Loading listing...</h1>
        <p className="text-sm text-muted-foreground">
          Loading seller, book details, and request options.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="aspect-[4/3] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
        <div className="h-96 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      </div>
    </section>
  );
}
