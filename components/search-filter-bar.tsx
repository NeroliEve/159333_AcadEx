"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/ui/pill-button";
import {
  FILTER_PARAM_KEYS,
  buildClearFiltersHref,
  buildRemoveFilterHref,
  buildSearchFilterHref,
  buildStartOverHref,
  getValidListingSort,
} from "@/lib/browse-search";
import type { CourseOption, StudyAreaOption, UniversityOption } from "@/lib/marketplace";

type SearchFilterBarProps = {
  courses: CourseOption[];
  studyAreas: StudyAreaOption[];
  universities: UniversityOption[];
};

const PRICE_MIN = 0;
const PRICE_MAX = 500;

const CONDITION_LABELS: Record<string, string> = {
  fair: "Fair",
  good: "Good",
  like_new: "Like new",
  new: "New",
  poor: "Poor",
};

const LISTING_TYPE_LABELS: Record<string, string> = {
  sale_only: "For sale",
  sale_or_trade: "Sale or trade",
  trade_only: "Trade only",
};

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
};

export function SearchFilterBar({ courses, studyAreas, universities }: SearchFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const formRef = useRef<HTMLFormElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [minPrice, setMinPrice] = useState(
    searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : PRICE_MIN,
  );
  const [maxPrice, setMaxPrice] = useState(
    searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : PRICE_MAX,
  );
  const currentSort = getValidListingSort(searchParams.get("sort"));

  useEffect(() => {
    setMinPrice(searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : PRICE_MIN);
    setMaxPrice(searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : PRICE_MAX);
  }, [searchParams]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    router.push(buildSearchFilterHref(new URLSearchParams(currentQueryString), {
      condition: formData.get("condition") as string,
      courseId: formData.get("courseId") as string,
      listingType: formData.get("listingType") as string,
      maxPrice: maxPrice < PRICE_MAX ? String(maxPrice) : "",
      minPrice: minPrice > PRICE_MIN ? String(minPrice) : "",
      q: formData.get("q") as string,
      sort: currentSort,
      studyAreaId: formData.get("studyAreaId") as string,
      universityId: formData.get("universityId") as string,
    }));
  }

  function handleClear() {
    formRef.current?.reset();
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    router.push(buildClearFiltersHref(new URLSearchParams(currentQueryString)));
  }

  const hasFilters =
    FILTER_PARAM_KEYS.some((key) => searchParams.has(key)) ||
    currentSort !== "newest" ||
    minPrice > PRICE_MIN ||
    maxPrice < PRICE_MAX;

  const activeFilters = [
    ...FILTER_PARAM_KEYS.map((key) => {
      const value = searchParams.get(key);
      if (!value) return null;

      const label = getFilterLabel(key, value, { courses, studyAreas, universities });
      return {
        href: buildRemoveFilterHref(new URLSearchParams(currentQueryString), key),
        key,
        label,
      };
    }),
    currentSort !== "newest"
      ? {
          href: buildRemoveFilterHref(new URLSearchParams(currentQueryString), "sort"),
          key: "sort",
          label: SORT_LABELS[currentSort],
        }
      : null,
  ].filter((item): item is { href: string; key: string; label: string } => item !== null);

  return (
    <form
      key={currentQueryString}
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-xl border border-border/70 bg-card p-4"
    >
      {activeFilters.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <Link
              key={`${filter.key}-${filter.label}`}
              href={filter.href}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition hover:border-primary/30 hover:text-primary"
            >
              {filter.label}
              <span aria-hidden="true">x</span>
            </Link>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setFiltersOpen((open) => !open)}
        className="mb-4 inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium md:hidden"
        aria-expanded={filtersOpen}
      >
        Filters{activeFilters.length > 0 ? ` (${activeFilters.length})` : ""}
      </button>

      <div className={`${filtersOpen ? "grid" : "hidden"} gap-4 sm:grid-cols-2 md:grid lg:grid-cols-4`}>
        <div className="grid gap-2 sm:col-span-2 lg:col-span-4">
          <Label htmlFor="q">Search</Label>
          <Input
            id="q"
            name="q"
            placeholder="Search by title or author..."
            defaultValue={searchParams.get("q") ?? ""}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="universityId">University</Label>
          <select
            id="universityId"
            name="universityId"
            defaultValue={searchParams.get("universityId") ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Any university</option>
            {universities.map((uni) => (
              <option key={uni.id} value={uni.id}>
                {uni.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="condition">Condition</Label>
          <select
            id="condition"
            name="condition"
            defaultValue={searchParams.get("condition") ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Any condition</option>
            <option value="new">New</option>
            <option value="like_new">Like new</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="listingType">Listing type</Label>
          <select
            id="listingType"
            name="listingType"
            defaultValue={searchParams.get("listingType") ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Any type</option>
            <option value="sale_only">For sale</option>
            <option value="trade_only">Trade only</option>
            <option value="sale_or_trade">Sale or trade</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="studyAreaId">Area of study</Label>
          <select
            id="studyAreaId"
            name="studyAreaId"
            defaultValue={searchParams.get("studyAreaId") ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Any area</option>
            {studyAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="courseId">Course</Label>
          <select
            id="courseId"
            name="courseId"
            defaultValue={searchParams.get("courseId") ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Any course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.course_code} · {course.course_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Price range</Label>
            <span className="text-sm text-muted-foreground">
              {minPrice === PRICE_MIN && maxPrice === PRICE_MAX
                ? "Any price"
                : `$${minPrice} — ${maxPrice === PRICE_MAX ? "$500+" : `$${maxPrice}`}`}
            </span>
          </div>
          <div className="relative h-5 w-full">
            <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-secondary" />
            <div
              className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
              style={{
                left: `${(minPrice / PRICE_MAX) * 100}%`,
                right: `${100 - (maxPrice / PRICE_MAX) * 100}%`,
              }}
            />
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={10}
              value={minPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val <= maxPrice - 10) setMinPrice(val);
              }}
              className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary/30 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-primary"
            />
            <input
              type="range"
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={10}
              value={maxPrice}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (val >= minPrice + 10) setMaxPrice(val);
              }}
              className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-primary/30 [&::-webkit-slider-thumb]:bg-background [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Clear filters
          </button>
        )}
        {searchParams.has("mode") || searchParams.has("q") ? (
          <Link
            href={buildStartOverHref()}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Start over
          </Link>
        ) : null}
        <PillButton type="submit">Search</PillButton>
      </div>
    </form>
  );
}

function getFilterLabel(
  key: (typeof FILTER_PARAM_KEYS)[number],
  value: string,
  options: Pick<SearchFilterBarProps, "courses" | "studyAreas" | "universities">,
) {
  switch (key) {
    case "q":
      return `Search: ${value}`;
    case "condition":
      return CONDITION_LABELS[value] ?? value;
    case "courseId": {
      const course = options.courses.find((entry) => String(entry.id) === value);
      return course ? `Course: ${course.course_code}` : `Course: ${value}`;
    }
    case "listingType":
      return LISTING_TYPE_LABELS[value] ?? value;
    case "studyAreaId": {
      const area = options.studyAreas.find((entry) => String(entry.id) === value);
      return area ? `Area: ${area.name}` : `Area: ${value}`;
    }
    case "universityId": {
      const university = options.universities.find((entry) => String(entry.id) === value);
      return university ? `University: ${university.name}` : `University: ${value}`;
    }
    case "minPrice":
      return `From $${value}`;
    case "maxPrice":
      return `Up to $${value}`;
    case "sellerName":
      return `Seller: ${value}`;
  }
}
