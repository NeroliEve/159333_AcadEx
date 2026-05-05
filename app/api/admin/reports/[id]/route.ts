import { NextResponse } from "next/server";

import { getAdminContext, logAdminAction } from "@/lib/admin";

type ReportResponse = {
  message?: string;
  report?: Record<string, unknown>;
  status: "error" | "success";
};

const validStatuses = ["pending", "reviewed", "resolved", "dismissed"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { isAdmin, supabase, userId } = await getAdminContext();

    if (!userId) {
      return NextResponse.json<ReportResponse>(
        { message: "You need to sign in first.", status: "error" },
        { status: 401 },
      );
    }

    if (!isAdmin) {
      return NextResponse.json<ReportResponse>(
        { message: "Only active admins can review reports.", status: "error" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const nextStatus = typeof body.status === "string" ? body.status.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!validStatuses.includes(nextStatus as (typeof validStatuses)[number])) {
      return NextResponse.json<ReportResponse>(
        { message: "Choose a valid report status.", status: "error" },
        { status: 400 },
      );
    }

    const reviewedAt = nextStatus === "pending" ? null : new Date().toISOString();
    const reviewedBy = nextStatus === "pending" ? null : userId;

    const { data: report, error } = await supabase
      .from("reports")
      .update({
        reviewed_at: reviewedAt,
        reviewed_by: reviewedBy,
        status: nextStatus as (typeof validStatuses)[number],
      })
      .eq("id", id)
      .select("id, reviewed_at, reviewed_by, status")
      .single();

    if (error || !report) {
      return NextResponse.json<ReportResponse>(
        { message: error?.message ?? "Could not update this report.", status: "error" },
        { status: 400 },
      );
    }

    await logAdminAction(supabase, {
      actionType: `report_${nextStatus}`,
      adminId: userId,
      notes,
      targetId: id,
      targetType: "report",
    });

    return NextResponse.json<ReportResponse>({
      message: "Report updated.",
      report,
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<ReportResponse>(
      {
        message: error instanceof Error ? error.message : "Could not update this report.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
