"use client";

import { useState } from "react";
import { StarRating } from "@/components/star-rating";
import type { ReviewData } from "@/lib/marketplace";

type ReviewsListProps = {
  reviews: ReviewData[];
};

export function ReviewsList({ reviews }: ReviewsListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (reviews.length === 0) return null;

  return (
    <div className="space-y-4">
      <button
        className="flex items-center gap-2 text-xl font-semibold tracking-tight hover:text-muted-foreground transition-colors"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        Reviews ({reviews.length})
        <svg
          aria-hidden="true"
          className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewData }) {
  const reviewer = review.reviewer;
  const reviewerName = reviewer
    ? `${reviewer.first_name ?? ""} ${reviewer.last_name ?? ""}`.trim() || reviewer.username
    : "Acadex user";
  const roleLabel =
    review.reviewer_role === "buyer" ? "Bought from this user" : "Sold to this user";

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary">
            {reviewer?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={reviewerName}
                className="h-full w-full object-cover"
                src={reviewer.avatar_url}
              />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                {reviewerName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{reviewerName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <StarRating rating={review.rating} size="sm" />
          <p className="text-xs text-muted-foreground">
            {new Date(review.created_at).toLocaleDateString("en-NZ", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {review.comment ? (
        <p className="text-sm leading-6 text-muted-foreground">{review.comment}</p>
      ) : null}
    </div>
  );
}
