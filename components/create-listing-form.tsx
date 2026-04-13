"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PillButton } from "@/components/ui/pill-button";
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
import type { CourseOption } from "@/lib/marketplace";

type CreateListingFormProps = {
  courses: CourseOption[];
};

type FieldName =
  | "author"
  | "condition"
  | "course"
  | "description"
  | "imageUrl"
  | "price"
  | "title";

type CreateListingResponse = {
  fieldErrors?: Partial<Record<FieldName, string>>;
  message?: string;
  status: "error" | "success";
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

export function CreateListingForm({ courses }: CreateListingFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isRefreshing, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [state, setState] = useState<CreateListingResponse | null>(null);

  useEffect(() => {
    if (state?.status === "success") {
      formRef.current?.reset();
      startTransition(() => {
        router.refresh();
      });
    }
  }, [router, state]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    setState(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/listings", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        setState({
          message: "Acadex returned an invalid response while publishing.",
          status: "error",
        });
        return;
      }

      const data = (await response.json()) as CreateListingResponse;
      setState(data);
    } catch {
      setState({
        message: "Acadex could not reach the publish endpoint.",
        status: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">Book details</CardTitle>
        <CardDescription>
          Keep this practical. Students mainly need the title, price, condition,
          and enough detail to know whether to message you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {state?.message ? (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              state.status === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-destructive/20 bg-destructive/5 text-destructive"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{state.message}</p>
              {state.status === "success" ? (
                <PillButton asChild size="sm" variant="secondary">
                  <Link href="/home">Browse listings</Link>
                </PillButton>
              ) : null}
            </div>
          </div>
        ) : null}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="title">Book title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Campbell Biology"
                required
              />
              <FieldError message={state?.fieldErrors?.title} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                name="author"
                placeholder="Jane B. Reece"
              />
              <FieldError message={state?.fieldErrors?.author} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                min="1"
                name="price"
                placeholder="45"
                required
                step="1"
                type="number"
              />
              <FieldError message={state?.fieldErrors?.price} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                name="condition"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue="good"
              >
                <option value="new">New</option>
                <option value="like_new">Like new</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
              <FieldError message={state?.fieldErrors?.condition} />
            </div>

            {courses.length > 0 ? (
              <div className="grid gap-2">
                <Label htmlFor="courseId">Course</Label>
                <select
                  id="courseId"
                  name="courseId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  defaultValue=""
                >
                  <option value="">No specific course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.course_code} · {course.course_name}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Choose the course this book is most relevant to.
                </p>
                <FieldError message={state?.fieldErrors?.course} />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="course">Course code or paper</Label>
                <Input
                  id="course"
                  name="course"
                  placeholder="BIOSCI 107"
                />
                <p className="text-sm text-muted-foreground">
                  Acadex will create a basic course entry from this code if one
                  does not exist yet.
                </p>
                <FieldError message={state?.fieldErrors?.course} />
              </div>
            )}

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="imageUrl">Cover image URL</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                placeholder="https://..."
                type="url"
              />
              <p className="text-sm text-muted-foreground">
                File uploads are not wired yet, so use an image URL for now if
                you have one.
              </p>
              <FieldError message={state?.fieldErrors?.imageUrl} />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add edition notes, highlighting, missing pages, pickup details, or anything else a buyer should know."
              />
              <FieldError message={state?.fieldErrors?.description} />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Listings are published as sale listings for this MVP.
            </p>
            <PillButton
              className="w-full sm:w-auto"
              type="submit"
              disabled={isSubmitting || isRefreshing}
            >
              {isSubmitting || isRefreshing
                ? "Creating listing..."
                : "Publish listing"}
            </PillButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


