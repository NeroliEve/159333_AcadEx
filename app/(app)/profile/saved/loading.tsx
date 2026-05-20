export default function SavedListingsLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Saved listings</h1>
        <p className="text-sm text-muted-foreground">Loading saved listings...</p>
      </div>
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
