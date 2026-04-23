"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/star-rating";

type ReviewFormProps = {
  transactionId: string;
  revieweeId: string;
  reviewerRole: "buyer" | "seller";
  existingReview?: { rating: number; comment: string | null } | null;
};

const ratingLabels: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Excellent",
};

const starPath = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export function ReviewForm({ transactionId, revieweeId, reviewerRole, existingReview }: ReviewFormProps) {
  const router = useRouter();
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(existingReview?.rating ?? 0);
  const [comment, setComment] = useState(existingReview?.comment ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingReview);
  const [error, setError] = useState<string | null>(null);

  const displayRating = hoveredStar || selectedRating;

  if (submitted) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your review</p>
        <StarRating rating={selectedRating} size="sm" />
        {comment ? (
          <p className="text-sm text-muted-foreground">{comment}</p>
        ) : null}
        <button
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          onClick={() => setSubmitted(false)}
          type="button"
        >
          Edit review
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedRating === 0) {
      setError("Please select a star rating.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId,
        revieweeId,
        reviewerRole,
        rating: selectedRating,
        comment: comment.trim() || null,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setSubmitted(true);
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Leave a review
      </p>

      {/* Clickable star picker */}
      <div
        className="flex gap-0.5"
        onMouseLeave={() => setHoveredStar(0)}
        role="group"
        aria-label="Star rating"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            className="p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            onClick={() => setSelectedRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
          >
            <svg
              aria-hidden="true"
              className={`h-6 w-6 transition-colors ${star <= displayRating ? "text-yellow-400" : "text-muted-foreground/30"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d={starPath} />
            </svg>
          </button>
        ))}
      </div>

      <p className="h-4 text-xs text-muted-foreground">
        {displayRating > 0 ? ratingLabels[displayRating] : ""}
      </p>

      <textarea
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        maxLength={500}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a comment (optional)"
        rows={2}
        value={comment}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <button
        className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting || selectedRating === 0}
        type="submit"
      >
        {isSubmitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
