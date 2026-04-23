// Display-only star rating — safe to use in server and client components.
// Supports fractional values (e.g. 4.3) via a CSS clip on the filled star layer.

type StarRatingProps = {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
};

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const starPath = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export function StarRating({
  rating,
  maxStars = 5,
  size = "md",
  showValue = false,
}: StarRatingProps) {
  const clamped = Math.min(Math.max(rating, 0), maxStars);
  const starSize = sizeMap[size];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-flex gap-0.5"
        aria-label={`${clamped} out of ${maxStars} stars`}
      >
        {Array.from({ length: maxStars }).map((_, i) => {
          const fillPercent = Math.round(Math.min(Math.max(clamped - i, 0), 1) * 100);

          return (
            <span key={i} className={`relative inline-block ${starSize}`}>
              {/* Empty star background */}
              <svg aria-hidden="true" className={`${starSize} text-muted-foreground/30`} fill="currentColor" viewBox="0 0 20 20">
                <path d={starPath} />
              </svg>
              {/* Filled star clipped to fill percentage */}
              {fillPercent > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
                  <svg aria-hidden="true" className={`${starSize} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
                    <path d={starPath} />
                  </svg>
                </span>
              )}
            </span>
          );
        })}
      </span>

      {showValue && (
        <span className="text-sm font-medium text-muted-foreground">
          {clamped.toFixed(1)}
        </span>
      )}
    </span>
  );
}
