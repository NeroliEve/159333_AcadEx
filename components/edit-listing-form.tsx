"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { LISTING_UPDATED_TOAST_STORAGE_KEY } from "@/components/route-toast";
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
import type { CourseOption, ListingDetailData, ListingType, StudyAreaOption } from "@/lib/marketplace";

type EditListingFormProps = {
  listing: ListingDetailData;
  courses: CourseOption[];
  studyAreas: StudyAreaOption[];
};

type FieldName =
  | "author"
  | "condition"
  | "description"
  | "edition"
  | "imageUrl"
  | "isbn"
  | "listingType"
  | "price"
  | "publisher"
  | "title"
  | "wantedTradeText";

type UpdateListingResponse = {
  fieldErrors?: Partial<Record<FieldName, string>>;
  message?: string;
  status: "error" | "success";
};

type StorageUploadResponse =
  | {
      files: {
        path: string;
        url: string;
      }[];
      status: "success";
    }
  | {
      message: string;
      status: "error";
    };

type ListingImageSlot = {
  file?: File;
  id: string;
  url: string;
};

const MAX_LISTING_IMAGES = 3;
const MAX_LISTING_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}

async function removeUploadedListingImages(paths: string[]) {
  if (paths.length === 0) {
    return;
  }

  try {
    await fetch("/api/storage/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket: "listing-images",
        paths,
      }),
    });
  } catch {
    // Best-effort cleanup; keep the original form error visible.
  }
}

function getInitialImageSlots(listing: ListingDetailData): ListingImageSlot[] {
  const imageUrls =
    listing.images.length > 0
      ? [...listing.images]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((image) => image.image_url)
      : listing.primary_image_url
        ? [listing.primary_image_url]
        : [];

  return imageUrls.slice(0, MAX_LISTING_IMAGES).map((url) => ({
    id: `existing-${url}`,
    url,
  }));
}

export function EditListingForm({ listing, courses, studyAreas }: EditListingFormProps) {
  const router = useRouter();
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startTransition] = useTransition();
  const [state, setState] = useState<UpdateListingResponse | null>(null);
  const [imageSlots, setImageSlots] = useState<ListingImageSlot[]>(() => getInitialImageSlots(listing));
  // tracks listing type so we can conditionally show the trade text field
  const [listingType, setListingType] = useState<ListingType>(listing.listing_type ?? "sale_only");

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (incomingFiles.length === 0) return;

    if (imageSlots.length + incomingFiles.length > MAX_LISTING_IMAGES) {
      setState({
        fieldErrors: { imageUrl: "Add up to 3 listing images." },
        message: "Please fix the highlighted fields and try again.",
        status: "error",
      });
      return;
    }

    if (incomingFiles.some((file) => !file.type.startsWith("image/"))) {
      setState({
        fieldErrors: { imageUrl: "Only image files are supported." },
        message: "Please fix the highlighted fields and try again.",
        status: "error",
      });
      return;
    }

    if (incomingFiles.some((file) => file.size > MAX_LISTING_IMAGE_SIZE_BYTES)) {
      setState({
        fieldErrors: { imageUrl: "Each listing image must be 2MB or smaller." },
        message: "Please fix the highlighted fields and try again.",
        status: "error",
      });
      return;
    }

    const newSlots = incomingFiles.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return {
        file,
        id: `new-${crypto.randomUUID()}`,
        url,
      };
    });

    setState(null);
    setImageSlots((current) => [...current, ...newSlots]);
  }

  function removeImageSlot(slot: ListingImageSlot) {
    if (slot.file) {
      URL.revokeObjectURL(slot.url);
      objectUrlsRef.current.delete(slot.url);
    }

    setState(null);
    setImageSlots((current) => current.filter((imageSlot) => imageSlot.id !== slot.id));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(formData.entries());
    const uploadedImagePaths: string[] = [];

    setState(null);
    setIsSubmitting(true);

    try {
      const imageUrls: string[] = [];
      const uploadFormData = new FormData();

      for (const slot of imageSlots) {
        if (!slot.file) {
          imageUrls.push(slot.url);
          continue;
        }

        uploadFormData.append("files", slot.file);
      }

      if (uploadFormData.has("files")) {
        uploadFormData.append("bucket", "listing-images");

        const uploadResponse = await fetch("/api/storage/uploads", {
          method: "POST",
          body: uploadFormData,
        });
        const uploadData = (await uploadResponse.json()) as StorageUploadResponse;

        if (uploadData.status === "error") {
          setState({ message: uploadData.message, status: "error" });
          return;
        }

        uploadedImagePaths.push(...uploadData.files.map((file) => file.path));
        imageUrls.push(...uploadData.files.map((file) => file.url));
      }

      payload.imageUrls = imageUrls;

      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        await removeUploadedListingImages(uploadedImagePaths);
        setState({ message: "Acadex returned an invalid response.", status: "error" });
        return;
      }

      const data = (await response.json()) as UpdateListingResponse;
      if (data.status === "error" && uploadedImagePaths.length > 0) {
        await removeUploadedListingImages(uploadedImagePaths);
      }

      setState(data);

      if (data.status === "success") {
        try {
          window.sessionStorage.setItem(
            LISTING_UPDATED_TOAST_STORAGE_KEY,
            JSON.stringify({
              text: "Listing updated successfully.",
              type: "success",
            }),
          );
        } catch {
          // If storage is unavailable, keep the redirect flow and skip the toast.
        }

        setState(null);
        startTransition(() => router.push("/home"));
      }
    } catch {
      await removeUploadedListingImages(uploadedImagePaths);
      setState({ message: "Could not reach the server.", status: "error" });
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
        {state?.message && state.status === "error" ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {state.message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="title">Book title</Label>
              <Input id="title" name="title" defaultValue={listing.title} required />
              <FieldError message={state?.fieldErrors?.title} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" name="author" defaultValue={listing.author ?? ""} />
              <FieldError message={state?.fieldErrors?.author} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edition">Edition</Label>
              <Input id="edition" name="edition" placeholder="12th Edition" defaultValue={listing.edition ?? ""} />
              <FieldError message={state?.fieldErrors?.edition} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="isbn">ISBN</Label>
              <Input id="isbn" name="isbn" placeholder="978-0135188743" defaultValue={listing.isbn ?? ""} />
              <FieldError message={state?.fieldErrors?.isbn} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input id="publisher" name="publisher" placeholder="Pearson" defaultValue={listing.publisher ?? ""} />
              <FieldError message={state?.fieldErrors?.publisher} />
            </div>

            {listingType !== "trade_only" && (
              <div className="grid gap-2">
                <Label htmlFor="price">Price (NZD)</Label>
                <Input id="price" name="price" type="number" min="1" step="1" defaultValue={listing.price ?? ""} required />
                <FieldError message={state?.fieldErrors?.price} />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <select id="condition" name="condition" defaultValue={listing.condition} className={selectClass}>
                <option value="new">New</option>
                <option value="like_new">Like new</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
              <FieldError message={state?.fieldErrors?.condition} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="listingType">Listing type</Label>
              <select
                id="listingType"
                name="listingType"
                className={selectClass}
                value={listingType}
                onChange={(e) => setListingType(e.target.value as ListingType)}
              >
                <option value="sale_only">For sale</option>
                <option value="trade_only">Trade only</option>
                <option value="sale_or_trade">Sale or trade</option>
              </select>
              <FieldError message={state?.fieldErrors?.listingType} />
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
                    {course.course_code} - {course.course_name}
                  </option>
                ))}
              </select>
            </div>

            {listingType !== "sale_only" && (
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="wantedTradeText">What would you trade for?</Label>
                <Input
                  id="wantedTradeText"
                  name="wantedTradeText"
                  placeholder="e.g. Organic Chemistry 8th ed, or any calculus textbook"
                  defaultValue={listing.wanted_trade_text ?? ""}
                />
                <FieldError message={state?.fieldErrors?.wantedTradeText} />
              </div>
            )}

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="listingImages">Listing images</Label>
              <p className="text-sm text-muted-foreground">
                Add up to 3 images. Maximum size is 2MB per image.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {imageSlots.map((slot, index) => (
                  <div
                    key={slot.id}
                    className="group relative overflow-hidden rounded-lg border border-border/70 bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={`Listing image preview ${index + 1}`}
                      className="aspect-[4/3] w-full object-cover"
                      src={slot.url}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-background/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-background"
                      onClick={() => removeImageSlot(slot)}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {imageSlots.length < MAX_LISTING_IMAGES ? (
                  <label
                    htmlFor="listingImages"
                    className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-secondary/30 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <span className="text-3xl leading-none">+</span>
                    <span className="mt-2 text-sm font-medium">Add image</span>
                  </label>
                ) : null}
              </div>
              <Input
                id="listingImages"
                accept="image/*"
                className="sr-only"
                multiple
                onChange={handleImageChange}
                type="file"
              />
              <FieldError message={state?.fieldErrors?.imageUrl} />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" defaultValue={listing.description ?? ""} />
              <FieldError message={state?.fieldErrors?.description} />
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
