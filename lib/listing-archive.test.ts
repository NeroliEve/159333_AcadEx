import { describe, expect, it } from "vitest";

import {
  canViewArchivedListing,
  getCompletedListingArchiveUpdate,
  getListingStatusUpdate,
  getListingStatusLabel,
  getSellerListingStatusOptions,
} from "@/lib/listing-archive";

describe("listing archive rules", () => {
  it("archives completed transaction listings with an archive timestamp", () => {
    expect(getCompletedListingArchiveUpdate("2026-05-15T01:02:03.000Z")).toEqual({
      status: "archived",
      archived_at: "2026-05-15T01:02:03.000Z",
    });
  });

  it("sets archived_at only for archived status changes", () => {
    expect(getListingStatusUpdate("archived", "2026-05-15T01:02:03.000Z")).toEqual({
      status: "archived",
      archived_at: "2026-05-15T01:02:03.000Z",
    });

    expect(getListingStatusUpdate("available", "2026-05-15T01:02:03.000Z")).toEqual({
      status: "available",
      archived_at: null,
    });
  });

  it("uses sold as the user-facing label for archive-backed listings", () => {
    expect(getListingStatusLabel("archived")).toBe("Sold");
    expect(getListingStatusLabel("available")).toBe("Available");
  });

  it("keeps archive-backed status options for seller-managed sold listings", () => {
    expect(getSellerListingStatusOptions("available")).toEqual(["pending", "archived"]);
    expect(getSellerListingStatusOptions("pending")).toEqual(["available", "archived"]);
    expect(getSellerListingStatusOptions("sold")).toEqual(["archived"]);
  });

  it("allows only admins, sellers, and transaction participants to view archived listings", () => {
    const base = {
      sellerId: "seller-1",
      viewerId: "viewer-1",
      participantIds: ["buyer-1"],
    };

    expect(canViewArchivedListing({ ...base, isAdmin: true })).toBe(true);
    expect(canViewArchivedListing({ ...base, viewerId: "seller-1" })).toBe(true);
    expect(canViewArchivedListing({ ...base, viewerId: "buyer-1" })).toBe(true);
    expect(canViewArchivedListing({ ...base, viewerId: "unrelated-1" })).toBe(false);
    expect(canViewArchivedListing({ ...base, viewerId: null })).toBe(false);
  });
});
