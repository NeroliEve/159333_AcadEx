"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) {
        setIsConfirming(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isConfirming, isDeleting]);

  function closeDialog() {
    if (isDeleting) {
      return;
    }

    setErrorMessage(null);
    setIsConfirming(false);
  }

  async function handleDelete() {
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setErrorMessage(payload.message ?? "Could not delete this listing.");
        return;
      }
      setIsConfirming(false);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setErrorMessage(null);
          setIsConfirming(true);
        }}
        disabled={isDeleting}
        className="text-xs text-destructive underline underline-offset-4 hover:opacity-70 disabled:opacity-50"
        type="button"
      >
        Delete
      </button>

      {isConfirming ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-background/75 px-4 backdrop-blur-sm"
          onPointerDown={closeDialog}
        >
          <div
            aria-describedby="delete-listing-description"
            aria-labelledby="delete-listing-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg border border-border bg-popover p-5 text-popover-foreground shadow-xl"
            onPointerDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="space-y-2">
              <h2 id="delete-listing-title" className="text-base font-semibold">
                Delete listing?
              </h2>
              <p id="delete-listing-description" className="text-sm text-muted-foreground">
                This will permanently remove the listing from the marketplace.
              </p>
              {errorMessage ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                disabled={isDeleting}
                onClick={closeDialog}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={isDeleting}
                onClick={handleDelete}
                type="button"
                variant="destructive"
              >
                {isDeleting ? "Deleting..." : "Delete listing"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
