"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        window.alert(payload.message ?? "Could not delete this listing.");
        return;
      }
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-xs text-destructive underline underline-offset-4 hover:opacity-70 disabled:opacity-50"
    >
      {isDeleting ? "Deleting..." : "Delete"}
    </button>
  );
}
