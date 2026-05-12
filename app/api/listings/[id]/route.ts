import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";

type UpdateListingResponse = {
  fieldErrors?: Partial<Record<FieldName, string>>;
  message?: string;
  status: "error" | "success";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { profile: viewerProfile, supabase, userId } = await getViewerAccessContext();

    if (!userId) {
      return NextResponse.json<UpdateListingResponse>(
        { message: "You need to sign in to edit a listing.", status: "error" },
        { status: 401 },
      );
    }

    if (viewerProfile?.account_status === "suspended") {
      return getMarketplaceSuspendedResponse("edit listings");
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("primary_image_url, seller_id")
      .eq("id", id)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json<UpdateListingResponse>(
        { message: "Listing not found.", status: "error" },
        { status: 404 },
      );
    }

    const isOwner = listing.seller_id === userId;
    const isAdmin = viewerProfile?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json<UpdateListingResponse>(
        {
          message: "You do not have permission to edit this listing.",
          status: "error",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;

    const title           = str(body.title);
    const author          = str(body.author);
    const edition         = str(body.edition);
    const isbn            = str(body.isbn);
    const publisher       = str(body.publisher);
    const description     = str(body.description);
    const condition       = str(body.condition);
    const listingType     = str(body.listingType) || "sale_only";
    const wantedTradeText = str(body.wantedTradeText);
    const imageUrls       = getImageUrls(body);
    const priceValue      = typeof body.price === "string" || typeof body.price === "number"
      ? String(body.price).trim() : "";
    const courseIdValue   = typeof body.courseId === "string" || typeof body.courseId === "number"
      ? String(body.courseId).trim() : "";
    const studyAreaIdValue = typeof body.studyAreaId === "string" || typeof body.studyAreaId === "number"
      ? String(body.studyAreaId).trim() : "";

    const fieldErrors: Partial<Record<FieldName, string>> = {};

    if (!title) fieldErrors.title = "Book title is required.";

    const price = Number(priceValue);
    const isTradeOnly = listingType === "trade_only";
    if (!isTradeOnly && (!priceValue || Number.isNaN(price) || price <= 0)) {
      fieldErrors.price = "Enter a valid price greater than 0.";
    }

    if (listingType !== "sale_only" && !wantedTradeText) {
      fieldErrors.wantedTradeText = "Describe what you'd trade for.";
    }

    if (!validConditions.includes(condition as (typeof validConditions)[number])) {
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
      return NextResponse.json<UpdateListingResponse>(
        { fieldErrors, message: "Please fix the highlighted fields and try again.", status: "error" },
        { status: 400 },
      );
    }

    const { data: existingImages, error: existingImagesError } = await supabase
      .from("listing_images")
      .select("image_url")
      .eq("listing_id", id);

    if (existingImagesError) {
      return NextResponse.json<UpdateListingResponse>(
        { message: existingImagesError.message, status: "error" },
        { status: 400 },
      );
    }

    const existingImageUrls = new Set(
      [
        listing.primary_image_url,
        ...(existingImages ?? []).map((image) => image.image_url),
      ].filter(Boolean) as string[],
    );
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const expectedImagePrefixes = supabaseUrl
      ? [
          `${supabaseUrl}/storage/v1/object/public/listing-images/${listing.seller_id}/`,
          ...(isAdmin && userId !== listing.seller_id
            ? [`${supabaseUrl}/storage/v1/object/public/listing-images/${userId}/`]
            : []),
        ]
      : [];

    if (
      imageUrls.some((imageUrl) => {
        if (existingImageUrls.has(imageUrl)) return false;

        const matchingPrefix = expectedImagePrefixes.find((prefix) => imageUrl.startsWith(prefix));
        if (!matchingPrefix) return true;

        const filename = imageUrl.slice(matchingPrefix.length);
        return !filename || filename.includes("/");
      })
    ) {
      return NextResponse.json<UpdateListingResponse>(
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

    const { error } = await supabase
      .from("listings")
      .update({
        title,
        author:            author || null,
        edition:           edition || null,
        isbn:              isbn || null,
        publisher:         publisher || null,
        description:       description || null,
        price:             isTradeOnly ? null : price,
        condition:         condition as (typeof validConditions)[number],
        listing_type:      listingType as (typeof validListingTypes)[number],
        course_id:         courseId,
        study_area_id:     studyAreaId,
        primary_image_url: imageUrls[0] ?? null,
        // clear wanted_trade_text if listing type is switched back to sale only
        wanted_trade_text: listingType !== "sale_only" ? wantedTradeText || null : null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json<UpdateListingResponse>(
        { message: error.message, status: "error" },
        { status: 400 },
      );
    }

    const { error: deleteImagesError } = await supabase
      .from("listing_images")
      .delete()
      .eq("listing_id", id);

    if (deleteImagesError) {
      return NextResponse.json<UpdateListingResponse>(
        { message: deleteImagesError.message, status: "error" },
        { status: 400 },
      );
    }

    if (imageUrls.length > 0) {
      const { error: insertImagesError } = await supabase
        .from("listing_images")
        .insert(
          imageUrls.map((imageUrl, index) => ({
            image_url: imageUrl,
            is_primary: index === 0,
            listing_id: id,
            sort_order: index,
          })),
        );

      if (insertImagesError) {
        return NextResponse.json<UpdateListingResponse>(
          { message: insertImagesError.message, status: "error" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json<UpdateListingResponse>({
      message: "Listing updated successfully.",
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<UpdateListingResponse>(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not update listing.",
        status: "error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { profile: viewerProfile, supabase, userId } = await getViewerAccessContext();

    if (!userId) {
      return NextResponse.json(
        { message: "You need to sign in to delete a listing.", status: "error" },
        { status: 401 },
      );
    }

    if (viewerProfile?.account_status === "suspended") {
      return getMarketplaceSuspendedResponse("delete listings");
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", id)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json(
        { message: "Listing not found.", status: "error" },
        { status: 404 },
      );
    }

    const isOwner = listing.seller_id === userId;
    const isAdmin = viewerProfile?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { message: "You do not have permission to delete this listing.", status: "error" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { message: error.message, status: "error" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      message: "Listing deleted successfully.",
      status: "success",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not delete listing.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
