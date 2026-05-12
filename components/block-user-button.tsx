"use client";

import { useState } from "react";

type BlockUserButtonProps = {
  userId: string;
  initiallyBlocked: boolean;
};

export function BlockUserButton({ userId, initiallyBlocked }: BlockUserButtonProps) {
  const [isBlocked, setIsBlocked] = useState(initiallyBlocked);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setIsLoading(true);
    setError(null);

    const res = await fetch(`/api/blocks/${userId}`, {
      method: isBlocked ? "DELETE" : "POST",
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Could not update block.");
      setIsLoading(false);
      return;
    }

    setIsBlocked(!isBlocked);
    // Full reload — router.refresh() only invalidates the current route, so
    // /messages and other cached pages would still show the now-blocked user
    // until manually refreshed.
    window.location.reload();
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={toggle}
        disabled={isLoading}
        className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-destructive disabled:opacity-50"
      >
        {isLoading
          ? isBlocked
            ? "Unblocking…"
            : "Blocking…"
          : isBlocked
            ? "Unblock this user"
            : "Block this user"}
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
