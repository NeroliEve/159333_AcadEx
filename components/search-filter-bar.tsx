"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PillButton } from "@/components/ui/pill-button";
import type { CourseOption, StudyAreaOption, UniversityOption } from "@/lib/marketplace";

type SearchFilterBarProps = {
  courses: CourseOption[];
  studyAreas: StudyAreaOption[];
  universities: UniversityOption[];
};

const PRICE_MIN = 0;
const PRICE_MAX = 500;

export function SearchFilterBar({ courses, studyAreas, universities }: SearchFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);

  const [minPrice, setMinPrice] = useState(
    searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : PRICE_MIN,
  );
  const [maxPrice, setMaxPrice] = useState(
    searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : PRICE_MAX,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    const q = formData.get("q") as string;
    const condition = formData.get("condition") as string;
    const courseId = formData.get("courseId") as string;
    const listingType = formData.get("listingType") as string;
    const studyAreaId = formData.get("studyAreaId") as string;
    const universityId = formData.get("universityId") as string;

    if (q) params.set("q", q);
    if (condition) params.set("condition", condition);
    if (courseId) params.set("courseId", courseId);
    if (listingType) params.set("listingType", listingType);
    if (studyAreaId) params.set("studyAreaId", studyAreaId);
    if (universityId) params.set("universityId", universityId);
    if (minPrice > PRICE_MIN) params.set("minPrice", String(minPrice));
    if (maxPrice < PRICE_MAX) params.set("maxPrice", String(maxPrice));

    router.push(`/browse?${params.toString()}`);
  }

  function handleClear() {
    formRef.current?.reset();
    setMinPrice(PRICE_MIN);
    setMaxPrice(PRICE_MAX);
    router.push("/browse");
  }

  const hasFilters =
    searchParams.has("q") ||
    searchParams.has("condition") ||
    searchParams.has("courseId") ||
    searchParams.has("listingType") ||
    searchParams.has("studyAreaId") ||
    searchParams.has("universityId") ||
    minPrice > PRICE_MIN ||
    maxPrice < PRICE_MAX;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="rounded-xl border border-border/70 bg-card p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <PillButton type="submit">Search</PillButton>
      </div>
    </form>
  );
}
