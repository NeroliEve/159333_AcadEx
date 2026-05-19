type ListingUniversityVisibility = {
  seller: { university?: string | null } | null;
  show_seller_university?: boolean | null;
};

export function getVisibleSellerUniversity(listing: ListingUniversityVisibility) {
  if (listing.show_seller_university === false) return null;
  return listing.seller?.university ?? null;
}

type DatabaseError = {
  code?: string;
  details?: string;
  message?: string;
};

export function isMissingSellerUniversityColumnError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const { code, details, message } = error as DatabaseError;
  const text = `${message ?? ""} ${details ?? ""}`.toLowerCase();

  return (
    text.includes("show_seller_university") &&
    (text.includes("does not exist") ||
      text.includes("could not find") ||
      code === "42703" ||
      code === "PGRST204")
  );
}
