"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CourseOption, ListingDetailData, StudyAreaOption } from "@/lib/marketplace";

type EditListingFormProps = {
  listing: ListingDetailData;
  courses: CourseOption[];
  studyAreas: StudyAreaOption[];
};

export function EditListingForm({ listing, courses, studyAreas }: EditListingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  // tracks listing type so we can conditionally show the trade text field
  const [listingType, setListingType] = useState(listing.listing_type ?? "sale_only");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      setMessage({ text: data.message, type: data.status });

      if (data.status === "success") {
        startTransition(() => router.push("/home"));
      }
    } catch {
      setMessage({ text: "Could not reach the server.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">Book details</CardTitle>
        <CardDescription>Update the details for this listing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-destructive/20 bg-destructive/5 text-destructive"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">

            {/* Title — spans full width */}
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="title">Book title</Label>
              <Input id="title" name="title" defaultValue={listing.title} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" name="author" defaultValue={listing.author ?? ""} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edition">Edition</Label>
              <Input id="edition" name="edition" placeholder="12th Edition" defaultValue={listing.edition ?? ""} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input id="isbn" name="isbn" placeholder="978-0135188743" defaultValue={listing.isbn ?? ""} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input id="publisher" name="publisher" placeholder="Pearson" defaultValue={listing.publisher ?? ""} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">Price (NZD)</Label>
              <Input id="price" name="price" type="number" min="1" step="1" defaultValue={listing.price ?? ""} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <select id="condition" name="condition" defaultValue={listing.condition} className={selectClass}>
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
                className={selectClass}
                value={listingType}
                onChange={(e) => setListingType(e.target.value)}
              >
                <option value="sale_only">For sale</option>
                <option value="trade_only">Trade only</option>
                <option value="sale_or_trade">Sale or trade</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="studyAreaId">Area of study</Label>
              <select id="studyAreaId" name="studyAreaId" defaultValue={listing.study_area_id ?? ""} className={selectClass}>
                <option value="">Select an area</option>
                {studyAreas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="courseId">Course</Label>
              <select id="courseId" name="courseId" defaultValue={listing.course_id ?? ""} className={selectClass}>
                <option value="">No specific course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} · {course.course_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Only shown when listing type involves trading — placed after course so layout stays stable */}
            {listingType !== "sale_only" && (
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="wantedTradeText">What would you trade for?</Label>
                <Input
                  id="wantedTradeText"
                  name="wantedTradeText"
                  placeholder="e.g. Organic Chemistry 8th ed, or any calculus textbook"
                  defaultValue={listing.wanted_trade_text ?? ""}
                />
              </div>
            )}

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="imageUrl">Cover image URL</Label>
              <Input id="imageUrl" name="imageUrl" type="url" defaultValue={listing.primary_image_url ?? ""} />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={listing.description ?? ""} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline">
              <Link href="/home">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || isRefreshing}>
              {isSubmitting || isRefreshing ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
