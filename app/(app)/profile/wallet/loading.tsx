export default function WalletLoading() {
  return (
    <section className="space-y-6">
      <p className="text-sm text-muted-foreground">Loading wallet</p>
      <div className="h-36 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
      <div className="h-72 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
    </section>
  );
}
