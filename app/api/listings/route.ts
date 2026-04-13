import { NextResponse } from "next/server";

import type { ListingInsert } from "@/lib/marketplace";
import { createClient } from "@/lib/supabase/server";
import { hasEnvVars } from "@/lib/utils";

type FieldName =
  | "author"
  | "condition"
  | "description"
  | "imageUrl"
  | "price"
  | "title";

type CreateListingResponse = {
  fieldErrors?: Partial<Record<FieldName, string>>;
  message?: string;
  status: "error" | "success";
};

const validConditions = ["new", "like_new", "good", "fair", "poor"] as const;

export async function POST(request: Request) {
  try {
    if (!hasEnvVars) {
      return NextResponse.json<CreateListingResponse>(
        {
          message:
            "Supabase environment variables are missing, so listings cannot be created yet.",
          status: "error",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const author = typeof body.author === "string" ? body.author.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const priceValue =
      typeof body.price === "string" || typeof body.price === "number"
        ? String(body.price).trim()
        : "";
    const condition =
      typeof body.condition === "string" ? body.condition.trim() : "";
    const courseIdValue =
      typeof body.courseId === "string" || typeof body.courseId === "number"
        ? String(body.courseId).trim()
        : "";
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    const fieldErrors: Partial<Record<FieldName, string>> = {};

    if (!title) {
      fieldErrors.title = "Add the book title.";
    }

    const price = Number(priceValue);
    if (!priceValue) {
      fieldErrors.price = "Add a sale price.";
    } else if (Number.isNaN(price) || price <= 0) {
      fieldErrors.price = "Enter a valid price greater than 0.";
    }

    if (!condition) {
      fieldErrors.condition = "Choose the book condition.";
    } else if (
      !validConditions.includes(
        condition as (typeof validConditions)[number],
      )
    ) {
      fieldErrors.condition = "Choose a valid book condition.";
    }

    if (imageUrl && !URL.canParse(imageUrl)) {
      fieldErrors.imageUrl = "Add a valid image URL or leave this blank.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json<CreateListingResponse>(
        {
          fieldErrors,
          message: "Please fix the highlighted fields and try again.",
          status: "error",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<CreateListingResponse>(
        {
          message: "You need to sign in before creating a listing.",
          status: "error",
        },
        { status: 401 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json<CreateListingResponse>(
        {
          message:
            "Your profile is not ready yet. Please sign out and back in, then try again.",
          status: "error",
        },
        { status: 400 },
      );
    }

    let courseId: number | null = null;

    if (courseIdValue) {
      const parsedCourseId = Number(courseIdValue);
      if (!Number.isNaN(parsedCourseId)) {
        courseId = parsedCourseId;
      }
    }

    const listingPayload: ListingInsert = {
      author: author || null,
      condition: condition as (typeof validConditions)[number],
      course_id: courseId,
      description: description || null,
      listing_type: "sale_only",
      price,
      primary_image_url: imageUrl || null,
      seller_id: user.id,
      title,
    };

    const { error: listingError } = await supabase
      .from("listings")
      .insert(listingPayload);

    if (listingError) {
      return NextResponse.json<CreateListingResponse>(
        {
          message: listingError.message,
          status: "error",
        },
        { status: 400 },
      );
    }

    return NextResponse.json<CreateListingResponse>({
      message: "Your book is now listed on Acadex.",
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<CreateListingResponse>(
      {
        message:
          error instanceof Error
            ? error.message
            : "Acadex could not publish this listing right now.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
