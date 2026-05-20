export default function MessageThreadLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">Loading messages...</h2>
        <p className="text-sm text-muted-foreground">
          Loading this conversation and recent messages.
        </p>
      </div>
      <div className="flex h-[32rem] items-center justify-center rounded-2xl border border-border/70 bg-muted/40">
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      </div>
    </div>
  );
}
