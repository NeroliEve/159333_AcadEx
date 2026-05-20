export default function NewListingLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Create listing
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Post a book for sale
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Loading listing form...
        </p>
      </div>
      <div className="h-[36rem] animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}
