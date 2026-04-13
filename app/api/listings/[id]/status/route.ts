import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StatusResponse = {
  message?: string;
  status: "error" | "success";
};

const validStatuses = ["available", "pending", "sold", "archived"] as const;

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
      return NextResponse.json<StatusResponse>(
        { message: "You need to sign in to update a listing.", status: "error" },
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
      return NextResponse.json<StatusResponse>(
        { message: "Listing not found.", status: "error" },
        { status: 404 },
      );
    }

    const isOwner = listing.seller_id === user.id;
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
      .update({ status: newStatus as (typeof validStatuses)[number] })
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
