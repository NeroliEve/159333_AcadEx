import { NextResponse } from "next/server";

import {
  getAdminContext,
  logAdminAction,
  requireModerationNote,
} from "@/lib/admin";
import { getListingStatusUpdate } from "@/lib/listing-archive";

type ListingResponse = {
  listing?: Record<string, unknown>;
  message?: string;
  status: "error" | "success";
};

const validStatuses = ["available", "pending", "archived"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { isAdmin, supabase, userId } = await getAdminContext();

    if (!userId) {
      return NextResponse.json<ListingResponse>(
        { message: "You need to sign in first.", status: "error" },
        { status: 401 },
      );
    }

    if (!isAdmin) {
      return NextResponse.json<ListingResponse>(
        { message: "Only active admins can moderate listings.", status: "error" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const action =
      body.action === "hide" || body.action === "restore" || body.action === "status"
        ? body.action
        : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const nextStatus = typeof body.status === "string" ? body.status.trim() : "";

    if (!action) {
      return NextResponse.json<ListingResponse>(
        { message: "Choose a valid moderation action.", status: "error" },
        { status: 400 },
      );
    }

    if (action === "hide" || action === "restore") {
      requireModerationNote(notes, `${action} a listing`);
    }

    if (action === "status" && !validStatuses.includes(nextStatus as (typeof validStatuses)[number])) {
      return NextResponse.json<ListingResponse>(
        { message: "Choose a valid listing status.", status: "error" },
        { status: 400 },
      );
    }

    const updates =
      action === "hide"
        ? { deleted_at: new Date().toISOString() }
        : action === "restore"
          ? { deleted_at: null }
          : getListingStatusUpdate(nextStatus as (typeof validStatuses)[number], new Date().toISOString());

    const { data: listing, error } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", id)
      .select("archived_at, deleted_at, id, status, title")
      .single();

    if (error || !listing) {
      return NextResponse.json<ListingResponse>(
        { message: error?.message ?? "Could not update this listing.", status: "error" },
        { status: 400 },
      );
    }

    await logAdminAction(supabase, {
      actionType: action === "status" ? `listing_status_${nextStatus}` : `listing_${action}`,
      adminId: userId,
      notes,
      targetId: id,
      targetType: "listing",
    });

    return NextResponse.json<ListingResponse>({
      listing,
      message:
        action === "hide"
          ? "Listing hidden."
          : action === "restore"
            ? "Listing restored."
            : "Listing status updated.",
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<ListingResponse>(
      {
        message: error instanceof Error ? error.message : "Could not update this listing.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
