import type { PublicEnum } from "@/lib/supabase/database.types";

export type ListingStatus = PublicEnum<"listing_status">;

export type ListingStatusUpdate = {
  status: ListingStatus;
  archived_at: string | null;
};

const sellerStatusOptions: Record<ListingStatus, ListingStatus[]> = {
  available: ["pending", "archived"],
  pending: ["available", "archived"],
  sold: ["archived"],
  archived: ["available"],
};

export function getCompletedListingArchiveUpdate(archivedAt: string): ListingStatusUpdate {
  return {
    status: "archived",
    archived_at: archivedAt,
  };
}

export function getListingStatusUpdate(
  status: Exclude<ListingStatus, "sold">,
  now: string,
): ListingStatusUpdate {
  return {
    status,
    archived_at: status === "archived" ? now : null,
  };
}

export function getSellerListingStatusOptions(status: ListingStatus): ListingStatus[] {
  return sellerStatusOptions[status];
}

export function canViewArchivedListing({
  viewerId,
  sellerId,
  participantIds,
  isAdmin = false,
}: {
  viewerId: string | null | undefined;
  sellerId: string;
  participantIds: string[];
  isAdmin?: boolean;
}) {
  if (!viewerId) return false;
  return isAdmin || viewerId === sellerId || participantIds.includes(viewerId);
}
