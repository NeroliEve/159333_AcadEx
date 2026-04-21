"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DeleteListingButton } from "@/components/delete-listing-button";
import { ListingStatusButton } from "@/components/listing-status-button";
import { PillButton } from "@/components/ui/pill-button";
import type { PublicEnum } from "@/lib/supabase/database.types";

type ListingManageMenuProps = {
  currentStatus: PublicEnum<"listing_status">;
  listingId: string;
};

export function ListingManageMenu({
  currentStatus,
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
