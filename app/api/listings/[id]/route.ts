import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UpdateListingResponse = {
  message?: string;
  status: "error" | "success";
};

const validConditions = ["new", "like_new", "good", "fair", "poor"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<UpdateListingResponse>(
        { message: "You need to sign in to edit a listing.", status: "error" },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", id)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json<UpdateListingResponse>(
        { message: "Listing not found.", status: "error" },
        { status: 404 },
      );
    }

    const isOwner = listing.seller_id === user.id;
    const isAdmin = profile?.role === "admin";

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

    if (!title) {
      return NextResponse.json<UpdateListingResponse>(
        { message: "Book title is required.", status: "error" },
        { status: 400 },
      );
    }

    const price = Number(priceValue);
    if (!priceValue || Number.isNaN(price) || price <= 0) {
      return NextResponse.json<UpdateListingResponse>(
        { message: "Enter a valid price greater than 0.", status: "error" },
        { status: 400 },
      );
    }

    if (
      !validConditions.includes(condition as (typeof validConditions)[number])
    ) {
      return NextResponse.json<UpdateListingResponse>(
        { message: "Choose a valid book condition.", status: "error" },
        { status: 400 },
      );
    }

    const courseId =
      courseIdValue && !Number.isNaN(Number(courseIdValue))
        ? Number(courseIdValue)
        : null;

    const { error } = await supabase
      .from("listings")
      .update({
        title,
        author: author || null,
        description: description || null,
        price,
        condition: condition as (typeof validConditions)[number],
        course_id: courseId,
        primary_image_url: imageUrl || null,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json<UpdateListingResponse>(
        { message: error.message, status: "error" },
        { status: 400 },
      );
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: "You need to sign in to delete a listing.", status: "error" },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

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

    const isOwner = listing.seller_id === user.id;
    const isAdmin = profile?.role === "admin";

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
