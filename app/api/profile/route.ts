import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfileResponse = {
  message?: string;
  status: "error" | "success";
};

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ProfileResponse>(
        { message: "You need to sign in to update your profile.", status: "error" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
    const universityIdValue =
      typeof body.universityId === "string" || typeof body.universityId === "number"
        ? String(body.universityId).trim()
        : "";
    const universityId =
      universityIdValue === ""
        ? null
        : Number.isNaN(Number(universityIdValue))
          ? null
          : Number(universityIdValue);

    if (!firstName) {
      return NextResponse.json<ProfileResponse>(
        { message: "First name is required.", status: "error" },
        { status: 400 },
      );
    }

    if (!lastName) {
      return NextResponse.json<ProfileResponse>(
        { message: "Last name is required.", status: "error" },
        { status: 400 },
      );
    }

    if (!username) {
      return NextResponse.json<ProfileResponse>(
        { message: "Username is required.", status: "error" },
        { status: 400 },
      );
    }

    if (universityIdValue !== "" && universityId === null) {
      return NextResponse.json<ProfileResponse>(
        { message: "Choose a valid university.", status: "error" },
        { status: 400 },
      );
    }

    if (avatarUrl) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const expectedAvatarPrefix = supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/avatars/${user.id}/`
        : null;

      if (!URL.canParse(avatarUrl) || !expectedAvatarPrefix || !avatarUrl.startsWith(expectedAvatarPrefix)) {
        return NextResponse.json<ProfileResponse>(
          { message: "Upload a valid profile picture from your account.", status: "error" },
          { status: 400 },
        );
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl || null,
        first_name: firstName,
        last_name: lastName,
        username,
        university: null,
        university_id: universityId,
        bio: bio || null,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json<ProfileResponse>(
        { message: error.message, status: "error" },
        { status: 400 },
      );
    }

    return NextResponse.json<ProfileResponse>({
      message: "Profile updated successfully.",
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<ProfileResponse>(
      {
        message:
          error instanceof Error ? error.message : "Could not update profile.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
