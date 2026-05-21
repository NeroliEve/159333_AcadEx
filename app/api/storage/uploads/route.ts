import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type StorageBucket = "avatars" | "listing-images";

type StorageUploadResponse =
  | {
      files: {
        path: string;
        url: string;
      }[];
      status: "success";
    }
  | {
      message: string;
      status: "error";
    };

const uploadConfig: Record<
  StorageBucket,
  {
    maxFiles: number;
    maxSizeBytes: number;
    prefix: string;
  }
> = {
  avatars: {
    maxFiles: 1,
    maxSizeBytes: 1024 * 1024,
    prefix: "avatar",
  },
  "listing-images": {
    maxFiles: 3,
    maxSizeBytes: 2 * 1024 * 1024,
    prefix: "listing",
  },
};

function getBucket(value: FormDataEntryValue | unknown): StorageBucket | null {
  return value === "avatars" || value === "listing-images" ? value : null;
}

function getJsonBucket(value: unknown): StorageBucket | null {
  return value === "avatars" || value === "listing-images" ? value : null;
}

function getSafeExtension(filename: string, fallback: string) {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return /^[a-z0-9]{1,10}$/.test(extension) ? extension : fallback;
}

function isOwnedStoragePath(path: unknown, userId: string) {
  if (typeof path !== "string") {
    return false;
  }

  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) {
    return false;
  }

  const filename = path.slice(prefix.length);
  return Boolean(filename) && !filename.includes("/");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<StorageUploadResponse>(
        { message: "You need to sign in before uploading images.", status: "error" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const bucket = getBucket(formData.get("bucket"));

    if (!bucket) {
      return NextResponse.json<StorageUploadResponse>(
        { message: "Choose a valid upload destination.", status: "error" },
        { status: 400 },
      );
    }

    const config = uploadConfig[bucket];
    const files = formData
      .getAll("files")
      .filter((file): file is File => file instanceof File);

    if (files.length === 0) {
      return NextResponse.json<StorageUploadResponse>(
        { message: "Choose at least one image to upload.", status: "error" },
        { status: 400 },
      );
    }

    if (files.length > config.maxFiles) {
      return NextResponse.json<StorageUploadResponse>(
        { message: `Upload up to ${config.maxFiles} image${config.maxFiles === 1 ? "" : "s"}.`, status: "error" },
        { status: 400 },
      );
    }

    const invalidFile = files.find(
      (file) => !file.type.startsWith("image/") || file.size > config.maxSizeBytes,
    );

    if (invalidFile) {
      return NextResponse.json<StorageUploadResponse>(
        { message: "Only supported image files within the size limit can be uploaded.", status: "error" },
        { status: 400 },
      );
    }

    const uploadedPaths: string[] = [];
    const uploadedFiles: { path: string; url: string }[] = [];

    for (const file of files) {
      const extension = getSafeExtension(
        file.name,
        bucket === "avatars" ? "png" : "jpg",
      );
      const path = `${user.id}/${config.prefix}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
        });

      if (uploadError) {
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(bucket).remove(uploadedPaths);
        }

        return NextResponse.json<StorageUploadResponse>(
          { message: uploadError.message, status: "error" },
          { status: 400 },
        );
      }

      uploadedPaths.push(path);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      uploadedFiles.push({ path, url: data.publicUrl });
    }

    return NextResponse.json<StorageUploadResponse>({
      files: uploadedFiles,
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<StorageUploadResponse>(
      {
        message: error instanceof Error ? error.message : "Could not upload images.",
        status: "error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<StorageUploadResponse>(
        { message: "You need to sign in before removing uploaded images.", status: "error" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const bucket = getJsonBucket(body.bucket);
    const paths = Array.isArray(body.paths) ? body.paths : [];

    if (!bucket || paths.some((path) => !isOwnedStoragePath(path, user.id))) {
      return NextResponse.json<StorageUploadResponse>(
        { message: "Choose valid uploaded images to remove.", status: "error" },
        { status: 400 },
      );
    }

    if (paths.length > 0) {
      const { error } = await supabase.storage.from(bucket).remove(paths);

      if (error) {
        return NextResponse.json<StorageUploadResponse>(
          { message: error.message, status: "error" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json<StorageUploadResponse>({
      files: [],
      status: "success",
    });
  } catch (error) {
    return NextResponse.json<StorageUploadResponse>(
      {
        message:
          error instanceof Error ? error.message : "Could not remove uploaded images.",
        status: "error",
      },
      { status: 500 },
    );
  }
}
