export default function BrowseLoading() {
  return (
    <section className="flex flex-col gap-10">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Browse
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Browse student book listings
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Search, filter, and compare current books across the Acadex marketplace.
          </p>
        </div>
      </div>

      <div className="space-y-6" aria-live="polite" aria-busy="true">
        <p className="text-sm text-muted-foreground">Loading listings...</p>
        <div className="h-24 animate-pulse rounded-xl border border-border/70 bg-muted/50" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-2xl border border-border/70 bg-muted/40"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
