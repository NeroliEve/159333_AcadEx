import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type EmailUpdateResponse = {
  email?: string;
  message?: string;
  status: "error" | "success";
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmailLike(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<EmailUpdateResponse>(
        { message: "You need to sign in to update your email.", status: "error" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";

    if (!email) {
      return NextResponse.json<EmailUpdateResponse>(
        { message: "Email is required.", status: "error" },
        { status: 400 },
      );
    }

    if (!isEmailLike(email)) {
      return NextResponse.json<EmailUpdateResponse>(
        { message: "Enter a valid email address.", status: "error" },
        { status: 400 },
      );
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      {
        email,
        email_confirm: true,
      },
    );

    if (error) {
      return NextResponse.json<EmailUpdateResponse>(
        { message: error.message, status: "error" },
        { status: 400 },
      );
    }

    const updatedEmail = data.user?.email ? normalizeEmail(data.user.email) : email;
    const { error: profileError } = await adminSupabase
      .from("profiles")
      .update({ email: updatedEmail })
      .eq("id", user.id);

    if (profileError) {
      console.error("Could not sync profile email after auth update.", profileError);
    }

    return NextResponse.json<EmailUpdateResponse>({
      email: updatedEmail,
      message: "Email updated successfully.",
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<EmailUpdateResponse>(
      {
        message: error instanceof Error ? error.message : "Could not update email.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
