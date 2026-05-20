export default function TransactionsLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Profile
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Transaction history</h1>
        <p className="text-sm text-muted-foreground">Loading transactions...</p>
      </div>
      <div className="space-y-3">
        <div className="h-44 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
        <div className="h-44 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      </div>
    </section>
  );
}
