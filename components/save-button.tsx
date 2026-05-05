"use client";

import { useState } from "react";

type SaveButtonProps = {
  listingId: string;
  initialSaved: boolean;
};

export function SaveButton({ listingId, initialSaved }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault(); // stop the card link from firing
    e.stopPropagation();

    setLoading(true);
    const method = saved ? "DELETE" : "POST";
    const response = await fetch("/api/saved-listings", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(payload.error ?? "Could not update your saved listings.");
      setLoading(false);
      return;
    }
    setSaved((prev) => !prev);
    setLoading(false);
  }

  return (
    <button
      aria-label={saved ? "Unsave listing" : "Save listing"}
      className={`flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/80 backdrop-blur-sm transition-colors hover:bg-background disabled:cursor-not-allowed ${saved ? "text-red-500" : "text-muted-foreground hover:text-red-400"}`}
      disabled={loading}
      onClick={handleToggle}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
