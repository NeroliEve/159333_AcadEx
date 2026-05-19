export default function SavedListingsLoading() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">Loading saved listings</p>
      <div className="h-10 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
          />
        ))}
      </div>
    </section>
  );
}
