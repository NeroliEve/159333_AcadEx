import { NextResponse } from "next/server";

import { getMarketplaceSuspendedResponse, getViewerAccessContext } from "@/lib/admin";
import { isMissingSellerUniversityColumnError } from "@/lib/listing-visibility";
import type { ListingInsert } from "@/lib/marketplace";
import { hasEnvVars } from "@/lib/utils";

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

type CreateListingResponse = {
  fieldErrors?: Partial<Record<FieldName, string>>;
  message?: string;
  status: "error" | "success";
};

const validConditions = ["new", "like_new", "good", "fair", "poor"] as const;
const validListingTypes = ["sale_only", "trade_only", "sale_or_trade"] as const;

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getImageUrls(body: Record<string, unknown>) {
  if (Array.isArray(body.imageUrls)) {
    return body.imageUrls
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
  }

  const imageUrl = str(body.imageUrl);
  return imageUrl ? [imageUrl] : [];
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return fallback;

  return ["1", "on", "true", "yes"].includes(value.trim().toLowerCase());
}

export async function POST(request: Request) {
  try {
    if (!hasEnvVars) {
      return NextResponse.json<CreateListingResponse>(
        { message: "Supabase environment variables are missing.", status: "error" },
        { status: 500 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const title         = str(body.title);
    const author        = str(body.author);
    const edition       = str(body.edition);
    const isbn          = str(body.isbn);
    const publisher     = str(body.publisher);
    const description   = str(body.description);
    const condition     = str(body.condition);
    const listingType   = str(body.listingType) || "sale_only";
    const wantedTradeText = str(body.wantedTradeText);
    const showSellerUniversity = bool(body.showSellerUniversity, true);
    const imageUrls     = getImageUrls(body);
    const priceValue    = typeof body.price === "string" || typeof body.price === "number"
      ? String(body.price).trim()
      : "";
    const courseIdValue = typeof body.courseId === "string" || typeof body.courseId === "number"
      ? String(body.courseId).trim()
      : "";
    const studyAreaIdValue = typeof body.studyAreaId === "string" || typeof body.studyAreaId === "number"
      ? String(body.studyAreaId).trim()
      : "";

    const fieldErrors: Partial<Record<FieldName, string>> = {};

    if (!title) fieldErrors.title = "Add the book title.";

    const price = Number(priceValue);
    const isTradeOnly = listingType === "trade_only";
    if (!isTradeOnly) {
      if (!priceValue) {
        fieldErrors.price = "Add a sale price.";
      } else if (Number.isNaN(price) || price <= 0) {
        fieldErrors.price = "Enter a valid price greater than 0.";
      }
    }

    if (listingType !== "sale_only" && !wantedTradeText) {
      fieldErrors.wantedTradeText = "Describe what you'd trade for.";
    }

    if (!condition) {
      fieldErrors.condition = "Choose the book condition.";
    } else if (!validConditions.includes(condition as (typeof validConditions)[number])) {
      fieldErrors.condition = "Choose a valid book condition.";
    }

    if (!validListingTypes.includes(listingType as (typeof validListingTypes)[number])) {
      fieldErrors.listingType = "Choose a valid listing type.";
    }

    if (imageUrls.length > 3) {
      fieldErrors.imageUrl = "Add up to 3 listing images.";
    } else if (imageUrls.some((imageUrl) => !URL.canParse(imageUrl))) {
      fieldErrors.imageUrl = "Upload valid listing images or leave this blank.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json<CreateListingResponse>(
        { fieldErrors, message: "Please fix the highlighted fields and try again.", status: "error" },
        { status: 400 },
      );
    }

    const { profile: viewerProfile, supabase, userId } = await getViewerAccessContext();

    if (!userId) {
      return NextResponse.json<CreateListingResponse>(
        { message: "You need to sign in before creating a listing.", status: "error" },
        { status: 401 },
      );
    }

    if (viewerProfile?.account_status === "suspended") {
      return getMarketplaceSuspendedResponse("create listings");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json<CreateListingResponse>(
        { message: "Your profile is not ready yet. Please sign out and back in, then try again.", status: "error" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const expectedImagePrefix = supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/listing-images/${userId}/`
      : null;

    if (
      imageUrls.some((imageUrl) => {
        if (!expectedImagePrefix || !imageUrl.startsWith(expectedImagePrefix)) {
          return true;
        }

        const filename = imageUrl.slice(expectedImagePrefix.length);
        return !filename || filename.includes("/");
      })
    ) {
      return NextResponse.json<CreateListingResponse>(
        {
          fieldErrors: {
            imageUrl: "Upload listing images from your account.",
          },
          message: "Please fix the highlighted fields and try again.",
          status: "error",
        },
        { status: 400 },
      );
    }

    const courseId = courseIdValue && !Number.isNaN(Number(courseIdValue))
      ? Number(courseIdValue)
      : null;

    const studyAreaId = studyAreaIdValue && !Number.isNaN(Number(studyAreaIdValue))
      ? Number(studyAreaIdValue)
      : null;

    const listingPayload: ListingInsert = {
      author:           author || null,
      condition:        condition as (typeof validConditions)[number],
      course_id:        courseId,
      description:      description || null,
      edition:          edition || null,
      isbn:             isbn || null,
      listing_type:     listingType as (typeof validListingTypes)[number],
      price:            isTradeOnly ? null : price,
      primary_image_url: imageUrls[0] ?? null,
      publisher:        publisher || null,
      seller_id:        userId,
      show_seller_university: showSellerUniversity,
      study_area_id:    studyAreaId,
      title,
      // only store wanted_trade_text when the listing type involves trading
      wanted_trade_text: listingType !== "sale_only" ? wantedTradeText || null : null,
    };

    let insertResult = await supabase
      .from("listings")
      .insert(listingPayload)
      .select("id")
      .single();

    if (isMissingSellerUniversityColumnError(insertResult.error)) {
      const legacyListingPayload = { ...listingPayload };
      delete legacyListingPayload.show_seller_university;

      insertResult = await supabase
        .from("listings")
        .insert(legacyListingPayload)
        .select("id")
        .single();
    }

    const { data: listing, error: listingError } = insertResult;

    if (listingError) {
      return NextResponse.json<CreateListingResponse>(
        { message: listingError.message, status: "error" },
        { status: 400 },
      );
    }

    if (imageUrls.length > 0) {
      const { error: imageError } = await supabase
        .from("listing_images")
        .insert(
          imageUrls.map((imageUrl, index) => ({
            image_url: imageUrl,
            is_primary: index === 0,
            listing_id: listing.id,
            sort_order: index,
          })),
        );

      if (imageError) {
        await supabase
          .from("listings")
          .delete()
          .eq("id", listing.id);

        return NextResponse.json<CreateListingResponse>(
          { message: imageError.message, status: "error" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json<CreateListingResponse>({
      message: "Your book is now listed on Acadex.",
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<CreateListingResponse>(
      {
        message: error instanceof Error ? error.message : "Acadex could not publish this listing right now.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
