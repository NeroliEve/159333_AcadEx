import { NextResponse } from "next/server";
import {
  didAvatarStorageRemoveDeleteObject,
  getOwnedAvatarStoragePathsFromList,
  getOwnedAvatarStoragePath,
} from "@/lib/profile-avatar";
import { parseAcademicProfileFields } from "@/lib/profile-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ProfileResponse = {
  message?: string;
  status: "error" | "success";
};

async function removeAvatarFromStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
) {
  const { data, error } = await supabase.storage
    .from("avatars")
    .remove([storagePath]);

  if (!error && didAvatarStorageRemoveDeleteObject(data)) {
    return;
  }

  try {
    const admin = createAdminClient();
    const { error: adminError } = await admin.storage
      .from("avatars")
      .remove([storagePath]);

    if (adminError) {
      console.error("Could not remove previous avatar from storage.", adminError);
    }
  } catch (adminError) {
    console.error("Could not remove previous avatar from storage.", adminError);
  }
}

async function removeStaleAvatarsFromStorage({
  avatarUrl,
  currentAvatarUrl,
  supabase,
  userId,
}: {
  avatarUrl: string;
  currentAvatarUrl: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return;
  }

  const keepStoragePath = avatarUrl
    ? getOwnedAvatarStoragePath({ avatarUrl, supabaseUrl, userId })
    : null;
  const currentAvatarStoragePath = currentAvatarUrl
    ? getOwnedAvatarStoragePath({
        avatarUrl: currentAvatarUrl,
        supabaseUrl,
        userId,
      })
    : null;
  const storagePaths = new Set<string>();

  if (
    currentAvatarStoragePath &&
    currentAvatarStoragePath !== keepStoragePath
  ) {
    storagePaths.add(currentAvatarStoragePath);
  }

  try {
    const admin = createAdminClient();
    const { data: avatarFiles, error: listError } = await admin.storage
      .from("avatars")
      .list(userId);

    if (listError) {
      console.error("Could not list stale avatars from storage.", listError);
    } else {
      getOwnedAvatarStoragePathsFromList({
        files: avatarFiles,
        keepStoragePath,
        userId,
      }).forEach((storagePath) => storagePaths.add(storagePath));
    }

    if (storagePaths.size === 0) {
      return;
    }

    const { error: removeError } = await admin.storage
      .from("avatars")
      .remove([...storagePaths]);

    if (removeError) {
      console.error("Could not remove stale avatars from storage.", removeError);
    }

    return;
  } catch (adminError) {
    console.error("Could not remove stale avatars from storage.", adminError);
  }

  if (currentAvatarStoragePath && currentAvatarStoragePath !== keepStoragePath) {
    await removeAvatarFromStorage(supabase, currentAvatarStoragePath);
  }
}

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
    const academicFields = parseAcademicProfileFields(body);

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

    if (academicFields.errors.universityId) {
      return NextResponse.json<ProfileResponse>(
        { message: academicFields.errors.universityId, status: "error" },
        { status: 400 },
      );
    }

    if (academicFields.errors.degreeId) {
      return NextResponse.json<ProfileResponse>(
        { message: academicFields.errors.degreeId, status: "error" },
        { status: 400 },
      );
    }

    if (academicFields.errors.yearLevel) {
      return NextResponse.json<ProfileResponse>(
        { message: academicFields.errors.yearLevel, status: "error" },
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

    const { data: currentProfile, error: currentProfileError } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (currentProfileError) {
      return NextResponse.json<ProfileResponse>(
        { message: currentProfileError.message, status: "error" },
        { status: 400 },
      );
    }

    const currentAvatarUrl = currentProfile?.avatar_url ?? "";

    const { error } = await supabase
      .from("profiles")
      .update({
        avatar_url: avatarUrl || null,
        first_name: firstName,
        last_name: lastName,
        username,
        degree_id: academicFields.degreeId,
        university: null,
        university_id: academicFields.universityId,
        year_level: academicFields.yearLevel,
        bio: bio || null,
      })
      .eq("id", user.id);

    if (error) {
      return NextResponse.json<ProfileResponse>(
        { message: error.message, status: "error" },
        { status: 400 },
      );
    }

    await removeStaleAvatarsFromStorage({
      avatarUrl,
      currentAvatarUrl,
      supabase,
      userId: user.id,
    });

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
