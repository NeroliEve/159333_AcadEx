type OwnedAvatarStoragePathInput = {
  avatarUrl: string;
  supabaseUrl: string;
  userId: string;
};

type OwnedAvatarStoragePathsFromListInput = {
  files: unknown;
  keepStoragePath?: string | null;
  userId: string;
};

export function getOwnedAvatarStoragePath(
  input: OwnedAvatarStoragePathInput,
) {
  let avatarUrl: URL;
  let supabaseUrl: URL;

  try {
    avatarUrl = new URL(input.avatarUrl);
    supabaseUrl = new URL(input.supabaseUrl);
  } catch {
    return null;
  }

  if (avatarUrl.origin !== supabaseUrl.origin) {
    return null;
  }

  const prefix = "/storage/v1/object/public/avatars/";
  if (!avatarUrl.pathname.startsWith(prefix)) {
    return null;
  }

  const pathParts = avatarUrl.pathname.slice(prefix.length).split("/");
  if (pathParts.length !== 2) {
    return null;
  }

  const [encodedOwnerId, encodedFilename] = pathParts;
  if (!encodedOwnerId || !encodedFilename) {
    return null;
  }

  let ownerId: string;
  let filename: string;

  try {
    ownerId = decodeURIComponent(encodedOwnerId);
    filename = decodeURIComponent(encodedFilename);
  } catch {
    return null;
  }

  if (ownerId !== input.userId || !filename || filename.includes("/")) {
    return null;
  }

  return `${ownerId}/${filename}`;
}

export function didAvatarStorageRemoveDeleteObject(data: unknown) {
  return Array.isArray(data) && data.length > 0;
}

export function getOwnedAvatarStoragePathsFromList(
  input: OwnedAvatarStoragePathsFromListInput,
) {
  if (!Array.isArray(input.files)) {
    return [];
  }

  return input.files
    .map((file) => {
      if (!file || typeof file !== "object" || !("name" in file)) {
        return null;
      }

      const name = file.name;
      if (typeof name !== "string" || !name || name.includes("/")) {
        return null;
      }

      return `${input.userId}/${name}`;
    })
    .filter((path): path is string => {
      return Boolean(path) && path !== input.keepStoragePath;
    });
}
