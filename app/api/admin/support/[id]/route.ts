import { NextResponse } from "next/server";

import { getAdminContext, logAdminAction } from "@/lib/admin";

type SupportTicketResponse = {
  message?: string;
  status: "error" | "success";
  ticket?: Record<string, unknown>;
};

const validStatuses = ["open", "in_progress", "resolved", "closed"] as const;

function parseAssignedAdminId(value: unknown) {
  if (value === null || value === "") return null;
  return typeof value === "string" ? value : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { isAdmin, supabase, userId } = await getAdminContext();

    if (!userId) {
      return NextResponse.json<SupportTicketResponse>(
        { message: "You need to sign in first.", status: "error" },
        { status: 401 },
      );
    }

    if (!isAdmin) {
      return NextResponse.json<SupportTicketResponse>(
        { message: "Only active admins can manage support tickets.", status: "error" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const nextStatus = typeof body.status === "string" ? body.status.trim() : "";
    const assignedAdminId = parseAssignedAdminId(body.assignedAdminId);
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!validStatuses.includes(nextStatus as (typeof validStatuses)[number])) {
      return NextResponse.json<SupportTicketResponse>(
        { message: "Choose a valid support ticket status.", status: "error" },
        { status: 400 },
      );
    }

    const resolvedAt =
      nextStatus === "resolved" || nextStatus === "closed"
        ? new Date().toISOString()
        : null;

    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .update({
        assigned_admin_id: assignedAdminId,
        resolved_at: resolvedAt,
        status: nextStatus as (typeof validStatuses)[number],
      })
      .eq("id", id)
      .select("assigned_admin_id, id, resolved_at, status")
      .single();

    if (error || !ticket) {
      return NextResponse.json<SupportTicketResponse>(
        { message: error?.message ?? "Could not update this support ticket.", status: "error" },
        { status: 400 },
      );
    }

    await logAdminAction(supabase, {
      actionType: `support_ticket_${nextStatus}`,
      adminId: userId,
      notes,
      targetId: id,
      targetType: "support_ticket",
    });

    return NextResponse.json<SupportTicketResponse>({
      message: "Support ticket updated.",
      status: "success",
      ticket,
    });
  } catch (error) {
    return NextResponse.json<SupportTicketResponse>(
      {
        message:
          error instanceof Error ? error.message : "Could not update this support ticket.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
