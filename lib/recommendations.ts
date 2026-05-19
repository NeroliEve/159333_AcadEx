export type RecommendationProfile = {
  degreeStudyAreaId: number | null;
  id: string;
  universityId: number | null;
};

export type RecommendationListing = {
  course: { university_id: number | null } | null;
  created_at: string;
  id: string;
  seller: { id: string; university_id: number | null } | null;
  status: string;
  study_area: { id: number } | null;
};

export function getRecommendedListingsForProfile<TListing extends RecommendationListing>({
  limit = 6,
  listings,
  profile,
}: {
  limit?: number;
  listings: TListing[];
  profile: RecommendationProfile | null;
}): TListing[] {
  if (!profile?.degreeStudyAreaId || !profile.universityId) {
    return [];
  }

  return listings
    .filter((listing) => listing.seller?.id !== profile.id)
    .map((listing, index) => ({
      index,
      listing,
      score: getRecommendationScore(listing, profile),
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;

      const aTime = new Date(a.listing.created_at).getTime();
      const bTime = new Date(b.listing.created_at).getTime();
      if (aTime !== bTime) return bTime - aTime;

      return a.index - b.index;
    })
    .slice(0, limit)
    .map((entry) => entry.listing);
}

function getRecommendationScore(
  listing: RecommendationListing,
  profile: RecommendationProfile,
) {
  let score = 0;

  if (
    profile.degreeStudyAreaId &&
    listing.study_area?.id === profile.degreeStudyAreaId
  ) {
    score += 100;
  }

  if (
    profile.universityId &&
    (listing.course?.university_id === profile.universityId ||
      listing.seller?.university_id === profile.universityId)
  ) {
    score += 50;
  }

  if (listing.status === "available") {
    score += 10;
  }

  return score;
}
