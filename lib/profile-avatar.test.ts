import { describe, expect, it } from "vitest";

import {
  didAvatarStorageRemoveDeleteObject,
  getOwnedAvatarStoragePathsFromList,
  getOwnedAvatarStoragePath,
} from "@/lib/profile-avatar";

describe("getOwnedAvatarStoragePath", () => {
  const supabaseUrl = "https://example.supabase.co";
  const userId = "user-123";

  it("returns the storage path for an owned public avatar URL", () => {
    expect(
      getOwnedAvatarStoragePath({
        avatarUrl:
          "https://example.supabase.co/storage/v1/object/public/avatars/user-123/avatar-abc.png",
        supabaseUrl,
        userId,
      }),
    ).toBe("user-123/avatar-abc.png");
  });

  it("rejects another user's avatar URL", () => {
    expect(
      getOwnedAvatarStoragePath({
        avatarUrl:
          "https://example.supabase.co/storage/v1/object/public/avatars/other-user/avatar-abc.png",
        supabaseUrl,
        userId,
      }),
    ).toBeNull();
  });

  it("rejects malformed URLs", () => {
    expect(
      getOwnedAvatarStoragePath({
        avatarUrl: "not a url",
        supabaseUrl,
        userId,
      }),
    ).toBeNull();
  });

  it("rejects URLs outside the avatars bucket", () => {
    expect(
      getOwnedAvatarStoragePath({
        avatarUrl:
          "https://example.supabase.co/storage/v1/object/public/listing-images/user-123/avatar-abc.png",
        supabaseUrl,
        userId,
      }),
    ).toBeNull();
  });

  it("rejects nested avatar paths", () => {
    expect(
      getOwnedAvatarStoragePath({
        avatarUrl:
          "https://example.supabase.co/storage/v1/object/public/avatars/user-123/nested/avatar-abc.png",
        supabaseUrl,
        userId,
      }),
    ).toBeNull();
  });
});

describe("didAvatarStorageRemoveDeleteObject", () => {
  it("returns true when Supabase reports at least one deleted object", () => {
    expect(didAvatarStorageRemoveDeleteObject([{ name: "avatar-abc.png" }])).toBe(true);
  });

  it("returns false when Supabase returns an empty delete result", () => {
    expect(didAvatarStorageRemoveDeleteObject([])).toBe(false);
  });

  it("returns false when Supabase returns a non-array delete result", () => {
    expect(didAvatarStorageRemoveDeleteObject(null)).toBe(false);
  });
});

describe("getOwnedAvatarStoragePathsFromList", () => {
  it("returns flat avatar paths from a Supabase storage list response", () => {
    expect(
      getOwnedAvatarStoragePathsFromList({
        files: [{ name: "avatar-one.png" }, { name: "avatar-two.jpg" }],
        userId: "user-123",
      }),
    ).toEqual(["user-123/avatar-one.png", "user-123/avatar-two.jpg"]);
  });

  it("excludes the current avatar path", () => {
    expect(
      getOwnedAvatarStoragePathsFromList({
        files: [{ name: "avatar-one.png" }, { name: "avatar-two.jpg" }],
        keepStoragePath: "user-123/avatar-two.jpg",
        userId: "user-123",
      }),
    ).toEqual(["user-123/avatar-one.png"]);
  });

  it("rejects malformed list entries and nested names", () => {
    expect(
      getOwnedAvatarStoragePathsFromList({
        files: [
          { name: "" },
          { name: "nested/avatar.png" },
          { other: "avatar.png" },
          null,
        ],
        userId: "user-123",
      }),
    ).toEqual([]);
  });
});
