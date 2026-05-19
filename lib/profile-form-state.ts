export type ProfileAvatarIntent = "keep" | "replace" | "remove";

type ProfileFormValues = {
  bio: string;
  degreeId: string;
  firstName: string;
  lastName: string;
  universityId: string;
  username: string;
  yearLevel: string;
};

type SavedProfileValues = {
  avatarUrl?: string | null;
  bio?: string | null;
  degreeId?: number | null;
  firstName?: string | null;
  lastName?: string | null;
  universityId?: number | null;
  username?: string | null;
  yearLevel?: string | null;
};

type UnsavedProfileChangesInput = {
  avatarIntent: ProfileAvatarIntent;
  formValues: ProfileFormValues;
  hasSelectedAvatarFile: boolean;
  profile: SavedProfileValues | null;
};

export function hasUnsavedProfileChanges(
  input: UnsavedProfileChangesInput,
) {
  if (input.avatarIntent !== "keep" || input.hasSelectedAvatarFile) {
    return true;
  }

  const profile = input.profile;
  const savedValues: ProfileFormValues = {
    bio: profile?.bio ?? "",
    degreeId:
      profile?.degreeId === null || profile?.degreeId === undefined
        ? ""
        : String(profile.degreeId),
    firstName: profile?.firstName ?? "",
    lastName: profile?.lastName ?? "",
    universityId:
      profile?.universityId === null || profile?.universityId === undefined
        ? ""
        : String(profile.universityId),
    username: profile?.username ?? "",
    yearLevel: profile?.yearLevel ?? "",
  };

  return (
    input.formValues.bio !== savedValues.bio ||
    input.formValues.degreeId !== savedValues.degreeId ||
    input.formValues.firstName !== savedValues.firstName ||
    input.formValues.lastName !== savedValues.lastName ||
    input.formValues.universityId !== savedValues.universityId ||
    input.formValues.username !== savedValues.username ||
    input.formValues.yearLevel !== savedValues.yearLevel
  );
}

export function getRemoveProfilePictureDialogCopy() {
  return {
    body: "This only marks your profile picture for removal. Click Save changes to apply it to your profile.",
    cancelLabel: "Cancel",
    confirmLabel: "Remove picture",
    title: "Remove profile picture?",
  };
}
