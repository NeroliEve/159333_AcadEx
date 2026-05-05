"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicEnum } from "@/lib/supabase/database.types";

type ListingStatus = PublicEnum<"listing_status">;

const statusOptions: Record<ListingStatus, ListingStatus[]> = {
  available: ["pending", "sold", "archived"],
  pending: ["available", "sold", "archived"],
  sold: ["available", "archived"],
  archived: ["available"],
};

const statusLabels: Record<ListingStatus, string> = {
  available: "Available",
  pending: "Pending",
  sold: "Sold",
  archived: "Archived",
};

export function ListingStatusButton({
  listingId,
  currentStatus,
}: {
  listingId: string;
  currentStatus: ListingStatus;
}) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value as ListingStatus;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        window.alert(payload.message ?? "Could not update the listing status.");
        return;
      }
      router.refresh();
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <select
      onChange={handleChange}
      disabled={isUpdating}
      value={currentStatus}
      className="text-xs rounded border border-input bg-transparent px-2 py-1 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value={currentStatus}>{statusLabels[currentStatus]}</option>
      {statusOptions[currentStatus].map((s) => (
        <option key={s} value={s}>
          {statusLabels[s]}
        </option>
      ))}
    </select>
  );
}
