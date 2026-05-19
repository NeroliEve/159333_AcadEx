export default function TransactionsLoading() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">Loading transactions</p>
      <div className="h-10 w-72 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-44 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
        <div className="h-44 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      </div>
    </section>
  );
}
