export const LISTING_SORTS = ["newest", "price_asc", "price_desc"] as const;

export type ListingSort = (typeof LISTING_SORTS)[number];

export type SearchFilterFormValues = {
  condition?: string;
  courseId?: string;
  listingType?: string;
  maxPrice?: string;
  minPrice?: string;
  q?: string;
  sort?: string;
  studyAreaId?: string;
  universityId?: string;
};

export type BrowseSearchContext = {
  label: string | null;
  mode: "ai" | "keyword" | "none";
};

export const FILTER_PARAM_KEYS = [
  "q",
  "condition",
  "courseId",
  "listingType",
  "studyAreaId",
  "universityId",
  "minPrice",
  "maxPrice",
  "sellerName",
] as const;

const FORM_FILTER_KEYS = [
  "q",
  "condition",
  "courseId",
  "listingType",
  "studyAreaId",
  "universityId",
  "minPrice",
  "maxPrice",
  "sort",
] as const;

const AI_BASE_KEYS: Record<(typeof FILTER_PARAM_KEYS)[number], string> = {
  condition: "aiBaseCondition",
  courseId: "aiBaseCourseId",
  listingType: "aiBaseListingType",
  maxPrice: "aiBaseMaxPrice",
  minPrice: "aiBaseMinPrice",
  q: "aiBaseQ",
  sellerName: "aiBaseSellerName",
  studyAreaId: "aiBaseStudyAreaId",
  universityId: "aiBaseUniversityId",
};

export function getValidListingSort(value: string | null | undefined): ListingSort {
  return LISTING_SORTS.includes(value as ListingSort) ? (value as ListingSort) : "newest";
}

function cleanParams(params: URLSearchParams) {
  params.delete("_metadata");
  if (getValidListingSort(params.get("sort")) === "newest") {
    params.delete("sort");
  }
}

function buildBrowseHref(params: URLSearchParams) {
  cleanParams(params);
  const queryString = params.toString();
  return queryString ? `/browse?${queryString}` : "/browse";
}

export function getAiBaseParamKey(key: (typeof FILTER_PARAM_KEYS)[number]) {
  return AI_BASE_KEYS[key];
}

export function setAiBaseFilterParams(
  params: URLSearchParams,
  filters: Record<string, string | undefined>,
) {
  for (const key of FILTER_PARAM_KEYS) {
    const value = filters[key]?.trim();
    if (!value) continue;
    params.set(key, value);
    params.set(AI_BASE_KEYS[key], value);
  }
}

export function buildSearchFilterHref(
  currentParams: URLSearchParams,
  values: SearchFilterFormValues,
) {
  const params = new URLSearchParams(currentParams);

  for (const key of FORM_FILTER_KEYS) {
    if (!(key in values)) continue;

    const value = values[key]?.trim() ?? "";
    if (value && !(key === "sort" && getValidListingSort(value) === "newest")) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }

  if (params.get("mode") !== "ai" && params.get("q")) {
    params.set("mode", "keyword");
  }

  if (params.get("mode") === "keyword" && !params.get("q")) {
    params.delete("mode");
  }

  return buildBrowseHref(params);
}

export function buildClearFiltersHref(currentParams: URLSearchParams) {
  if (currentParams.get("mode") !== "ai") {
    return "/browse";
  }

  const params = new URLSearchParams();
  params.set("mode", "ai");

  for (const key of ["aiQuery", "_ai"] as const) {
    const value = currentParams.get(key);
    if (value) params.set(key, value);
  }

  for (const key of FILTER_PARAM_KEYS) {
    const baseKey = AI_BASE_KEYS[key];
    const value = currentParams.get(baseKey);
    if (!value) continue;
    params.set(baseKey, value);
  }

  for (const key of FILTER_PARAM_KEYS) {
    const value = currentParams.get(AI_BASE_KEYS[key]);
    if (!value) continue;
    params.set(key, value);
  }

  return buildBrowseHref(params);
}

export function buildRemoveFilterHref(
  currentParams: URLSearchParams,
  key: (typeof FILTER_PARAM_KEYS)[number] | "sort",
) {
  const params = new URLSearchParams(currentParams);

  params.delete(key);
  if (key !== "sort") {
    params.delete(AI_BASE_KEYS[key]);
  }

  if (params.get("mode") === "keyword" && key === "q") {
    params.delete("mode");
  }

  return buildBrowseHref(params);
}

export function buildStartOverHref() {
  return "/browse";
}

export function getBrowseSearchContext(
  searchParams: URLSearchParams,
): BrowseSearchContext {
  if (searchParams.get("mode") === "ai") {
    const aiQuery = searchParams.get("aiQuery")?.trim();
    return {
      label: aiQuery ? `AI search: "${aiQuery}"` : "AI search",
      mode: "ai",
    };
  }

  const keyword = searchParams.get("q")?.trim();
  if (keyword) {
    return {
      label: `Showing results for "${keyword}"`,
      mode: "keyword",
    };
  }

  return {
    label: null,
    mode: "none",
  };
}
