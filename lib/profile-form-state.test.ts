import { describe, expect, it } from "vitest";

import {
  getRemoveProfilePictureDialogCopy,
  hasUnsavedProfileChanges,
} from "@/lib/profile-form-state";

describe("hasUnsavedProfileChanges", () => {
  const profile = {
    avatarUrl: "https://example.supabase.co/avatar.png",
    bio: "Original bio",
    degreeId: 4,
    firstName: "Ada",
    lastName: "Lovelace",
    universityId: 12,
    username: "ada",
    yearLevel: "2",
  };

  it("returns false when profile details and avatar intent match the saved profile", () => {
    expect(
      hasUnsavedProfileChanges({
        avatarIntent: "keep",
        formValues: {
          bio: "Original bio",
          degreeId: "4",
          firstName: "Ada",
          lastName: "Lovelace",
          universityId: "12",
          username: "ada",
          yearLevel: "2",
        },
        hasSelectedAvatarFile: false,
        profile,
      }),
    ).toBe(false);
  });

  it("returns true when a profile field changes", () => {
    expect(
      hasUnsavedProfileChanges({
        avatarIntent: "keep",
        formValues: {
          bio: "Updated bio",
          degreeId: "4",
          firstName: "Ada",
          lastName: "Lovelace",
          universityId: "12",
          username: "ada",
          yearLevel: "2",
        },
        hasSelectedAvatarFile: false,
        profile,
      }),
    ).toBe(true);
  });

  it("returns true when the avatar is marked for removal", () => {
    expect(
      hasUnsavedProfileChanges({
        avatarIntent: "remove",
        formValues: {
          bio: "Original bio",
          degreeId: "4",
          firstName: "Ada",
          lastName: "Lovelace",
          universityId: "12",
          username: "ada",
          yearLevel: "2",
        },
        hasSelectedAvatarFile: false,
        profile,
      }),
    ).toBe(true);
  });

  it("returns true when a replacement avatar file is selected", () => {
    expect(
      hasUnsavedProfileChanges({
        avatarIntent: "replace",
        formValues: {
          bio: "Original bio",
          degreeId: "4",
          firstName: "Ada",
          lastName: "Lovelace",
          universityId: "12",
          username: "ada",
          yearLevel: "2",
        },
        hasSelectedAvatarFile: true,
        profile,
      }),
    ).toBe(true);
  });

  it("treats an empty university as unchanged when the saved profile has no university", () => {
    expect(
      hasUnsavedProfileChanges({
        avatarIntent: "keep",
        formValues: {
          bio: "",
          degreeId: "",
          firstName: "Ada",
          lastName: "Lovelace",
          universityId: "",
          username: "ada",
          yearLevel: "",
        },
        hasSelectedAvatarFile: false,
        profile: {
          ...profile,
          bio: null,
          degreeId: null,
          universityId: null,
          yearLevel: null,
        },
      }),
    ).toBe(false);
  });

  it("returns true when degree changes", () => {
    expect(
      hasUnsavedProfileChanges({
        avatarIntent: "keep",
        formValues: {
          bio: "Original bio",
          degreeId: "5",
          firstName: "Ada",
          lastName: "Lovelace",
          universityId: "12",
          username: "ada",
          yearLevel: "2",
        },
        hasSelectedAvatarFile: false,
        profile,
      }),
    ).toBe(true);
  });

  it("returns true when year level changes", () => {
    expect(
      hasUnsavedProfileChanges({
        avatarIntent: "keep",
        formValues: {
          bio: "Original bio",
          degreeId: "4",
          firstName: "Ada",
          lastName: "Lovelace",
          universityId: "12",
          username: "ada",
          yearLevel: "3",
        },
        hasSelectedAvatarFile: false,
        profile,
      }),
    ).toBe(true);
  });
});

describe("getRemoveProfilePictureDialogCopy", () => {
  it("includes a save reminder in the removal confirmation message", () => {
    expect(getRemoveProfilePictureDialogCopy()).toEqual({
      body: "This only marks your profile picture for removal. Click Save changes to apply it to your profile.",
      cancelLabel: "Cancel",
      confirmLabel: "Remove picture",
      title: "Remove profile picture?",
    });
  });
});
