"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DeleteListingButton } from "@/components/delete-listing-button";
import { ListingStatusButton } from "@/components/listing-status-button";
import { PillButton } from "@/components/ui/pill-button";
import type { PublicEnum } from "@/lib/supabase/database.types";

type ListingManageMenuProps = {
  currentStatus: PublicEnum<"listing_status">;
  initialSaved: boolean;
  listingId: string;
};

type SaveListingMenuItemProps = {
  initialSaved: boolean;
  listingId: string;
};

function SaveListingMenuItem({ initialSaved, listingId }: SaveListingMenuItemProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(initialSaved);

  async function handleToggle() {
    if (loading) return;

    setLoading(true);
    const response = await fetch("/api/saved-listings", {
      body: JSON.stringify({ listingId }),
      headers: { "Content-Type": "application/json" },
      method: saved ? "DELETE" : "POST",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(payload.error ?? "Could not update your saved listings.");
      setLoading(false);
      return;
    }

    setSaved((current) => !current);
    setLoading(false);
  }

  return (
    <button
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed ${saved ? "text-red-500" : "text-muted-foreground"}`}
      disabled={loading}
      onClick={handleToggle}
      role="menuitem"
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
      <span>{saved ? "Unsave listing" : "Save listing"}</span>
    </button>
  );
}

export function ListingManageMenu({
  currentStatus,
  initialSaved,
  listingId,
}: ListingManageMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <PillButton
        className="h-8 px-3 text-xs shadow-sm"
        variant="secondary"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Manage</span>
        <svg
          aria-hidden="true"
          className={`ml-1 h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </PillButton>

      {isOpen ? (
        <div
          role="menu"
          aria-label="Manage listing"
          className="absolute right-0 top-10 z-50 w-44 rounded-lg border border-border/70 bg-popover p-2 text-popover-foreground shadow-lg"
        >
          <Link
            href={`/listings/${listingId}`}
            role="menuitem"
            className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            View details
          </Link>
          <Link
            href={`/listings/${listingId}/edit`}
            role="menuitem"
            className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            Edit
          </Link>
          <SaveListingMenuItem
            initialSaved={initialSaved}
            listingId={listingId}
          />
          <div className="px-3 py-2">
            <ListingStatusButton
              listingId={listingId}
              currentStatus={currentStatus}
            />
          </div>
          <div className="px-3 py-2">
            <DeleteListingButton listingId={listingId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
