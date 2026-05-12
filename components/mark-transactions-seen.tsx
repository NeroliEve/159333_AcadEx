"use client";

import { useEffect } from "react";

// Fire-and-forget POST that updates profiles.transactions_seen_at to now,
// clearing the unseen-transactions badge in the user menu.
export function MarkTransactionsSeen() {
  useEffect(() => {
    void fetch("/api/transactions/mark-seen", { method: "POST" });
  }, []);

  return null;
}
