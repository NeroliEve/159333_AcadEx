import { NextResponse } from "next/server";

import {
  countActiveAdmins,
  getAdminContext,
  logAdminAction,
  requireModerationNote,
} from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

const USER_RETURN_SELECT =
  "account_status, avatar_url, bio, email, first_name, id, last_name, role, suspended_at, university, university_id, updated_at, username";

type UserResponse = {
  message?: string;
  status: "error" | "success";
  user?: Record<string, unknown>;
};

function parseUniversityId(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") return null;

  const parsed = Number(String(value).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { isAdmin, supabase, userId } = await getAdminContext();

    if (!userId) {
      return NextResponse.json<UserResponse>(
        { message: "You need to sign in first.", status: "error" },
        { status: 401 },
      );
    }

    if (!isAdmin) {
      return NextResponse.json<UserResponse>(
        { message: "Only active admins can manage users.", status: "error" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const role = body.role === "admin" || body.role === "user" ? body.role : null;
    const accountStatus =
      body.accountStatus === "active" || body.accountStatus === "suspended"
        ? body.accountStatus
        : null;
    const universityId = parseUniversityId(body.universityId);

    if (!firstName || !lastName || !username) {
      return NextResponse.json<UserResponse>(
        { message: "First name, last name, and username are required.", status: "error" },
        { status: 400 },
      );
    }

    if (role === null || accountStatus === null) {
      return NextResponse.json<UserResponse>(
        { message: "Provide a valid role and account status.", status: "error" },
        { status: 400 },
      );
    }

    const { data: currentUser, error: currentUserError } = await supabase
      .from("profiles")
      .select("account_status, bio, first_name, id, last_name, role, username, university_id")
      .eq("id", id)
      .maybeSingle();

    if (currentUserError) {
      return NextResponse.json<UserResponse>(
        { message: currentUserError.message, status: "error" },
        { status: 400 },
      );
    }

    if (!currentUser) {
      return NextResponse.json<UserResponse>(
        { message: "User not found.", status: "error" },
        { status: 404 },
      );
    }

    const roleChanged = currentUser.role !== role;
    const suspensionChanged = currentUser.account_status !== accountStatus;
    const activeAdminWouldBeLost =
      currentUser.role === "admin" &&
      currentUser.account_status === "active" &&
      (role !== "admin" || accountStatus !== "active");

    try {
      if (roleChanged) {
        requireModerationNote(notes, "change user roles");
      }

      if (suspensionChanged) {
        requireModerationNote(
          notes,
          accountStatus === "suspended" ? "suspend an account" : "reinstate an account",
        );
      }
    } catch (error) {
      return NextResponse.json<UserResponse>(
        {
          message:
            error instanceof Error
              ? error.message
              : "A moderation note is required for this action.",
          status: "error",
        },
        { status: 400 },
      );
    }

    if (activeAdminWouldBeLost && await countActiveAdmins(supabase) <= 1) {
      return NextResponse.json<UserResponse>(
        { message: "You cannot remove or suspend the last active admin.", status: "error" },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const { data: updatedUser, error: updateError } = await adminSupabase
      .from("profiles")
      .update({
        account_status: accountStatus,
        bio: bio || null,
        first_name: firstName,
        last_name: lastName,
        role,
        suspended_at: accountStatus === "suspended" ? new Date().toISOString() : null,
        suspended_by: accountStatus === "suspended" ? userId : null,
        university: null,
        university_id: universityId,
        updated_at: new Date().toISOString(),
        username,
      })
      .eq("id", id)
      .select(USER_RETURN_SELECT)
      .single();

    if (updateError || !updatedUser) {
      return NextResponse.json<UserResponse>(
        { message: updateError?.message ?? "Could not update this user.", status: "error" },
        { status: 400 },
      );
    }

    const actionFragments = [
      roleChanged ? "role" : null,
      suspensionChanged ? "suspension" : null,
      !roleChanged && !suspensionChanged ? "profile" : null,
    ].filter(Boolean);

    let message = "User updated.";
    try {
      await logAdminAction(supabase, {
        actionType: `user_${actionFragments.join("_")}_updated`,
        adminId: userId,
        notes,
        targetId: id,
        targetType: "profile",
      });
    } catch {
      message = "User updated, but audit logging is unavailable.";
    }

    return NextResponse.json<UserResponse>({
      message,
      status: "success",
      user: updatedUser,
    });
  } catch (error) {
    return NextResponse.json<UserResponse>(
      {
        message: error instanceof Error ? error.message : "Could not update this user.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
