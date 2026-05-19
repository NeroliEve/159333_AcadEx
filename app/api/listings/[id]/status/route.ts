import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";
import { getListingStatusUpdate } from "@/lib/listing-archive";

type StatusResponse = {
  message?: string;
  status: "error" | "success";
};

const validStatuses = ["available", "pending", "archived"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { profile, supabase, userId } = await getViewerAccessContext();

    if (!userId) {
      return NextResponse.json<StatusResponse>(
        { message: "You need to sign in to update a listing.", status: "error" },
        { status: 401 },
      );
    }

    if (profile?.account_status === "suspended") {
      return getMarketplaceSuspendedResponse("update listings");
    }

    const { data: listing } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", id)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json<StatusResponse>(
        { message: "Listing not found.", status: "error" },
        { status: 404 },
      );
    }

    const isOwner = listing.seller_id === userId;
    const isAdmin = profile?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json<StatusResponse>(
        { message: "You do not have permission to update this listing.", status: "error" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const newStatus = typeof body.status === "string" ? body.status.trim() : "";

    if (!validStatuses.includes(newStatus as (typeof validStatuses)[number])) {
      return NextResponse.json<StatusResponse>(
        { message: "Invalid status value.", status: "error" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("listings")
      .update(getListingStatusUpdate(newStatus as (typeof validStatuses)[number], new Date().toISOString()))
      .eq("id", id);

    if (error) {
      return NextResponse.json<StatusResponse>(
        { message: error.message, status: "error" },
        { status: 400 },
      );
    }

    return NextResponse.json<StatusResponse>({
      message: "Listing status updated.",
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<StatusResponse>(
      {
        message:
          error instanceof Error ? error.message : "Could not update status.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
