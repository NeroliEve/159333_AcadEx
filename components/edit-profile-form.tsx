"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PillButton } from "@/components/ui/pill-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UniversityOption, ViewerProfile } from "@/lib/marketplace";
import { createClient } from "@/lib/supabase/client";

type EditProfileFormProps = {
  profile: (ViewerProfile & { bio?: string | null }) | null;
  universities: UniversityOption[];
};

const MAX_AVATAR_SIZE_BYTES = 1024 * 1024;

export function EditProfileForm({
  profile,
  universities,
}: EditProfileFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(profile?.avatar_url ?? "");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);
  const toastTransitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clearMessage = () => {
      setMessage(null);
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        clearMessage();
      }
    };

    const handlePageHide = () => {
      clearMessage();
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("pagehide", handlePageHide);

      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const clearMessage = () => {
      setMessage(null);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const current = window.location;
      const isSameLocation =
        nextUrl.pathname === current.pathname &&
        nextUrl.search === current.search &&
        nextUrl.hash === current.hash;

      if (!isSameLocation) {
        clearMessage();
      }
    };

    const handlePopState = () => {
      clearMessage();
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/profile/edit") {
      setMessage(null);
    }
  }, [pathname]);

  useEffect(() => {
    setAvatarPreviewUrl(profile?.avatar_url ?? "");
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (message?.type !== "success") {
      setIsToastVisible(false);

      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }

      return;
    }

    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }

    if (toastTransitionTimeoutRef.current) {
      window.clearTimeout(toastTransitionTimeoutRef.current);
    }

    setIsToastVisible(false);

    requestAnimationFrame(() => {
      setIsToastVisible(true);
    });

    successTimeoutRef.current = window.setTimeout(() => {
      setIsToastVisible(false);

      toastTransitionTimeoutRef.current = window.setTimeout(() => {
        setMessage(null);
        toastTransitionTimeoutRef.current = null;
      }, 180);

      successTimeoutRef.current = null;
    }, 3000);

    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }

      if (toastTransitionTimeoutRef.current) {
        window.clearTimeout(toastTransitionTimeoutRef.current);
        toastTransitionTimeoutRef.current = null;
      }
    };
  }, [message]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setMessage(null);
    setIsSubmitting(true);

    try {
      let avatarUrl = profile?.avatar_url ?? "";

      if (selectedAvatarFile) {
        if (!profile?.id) {
          setMessage({ text: "Your profile is not ready for avatar uploads yet.", type: "error" });
          return;
        }

        if (!selectedAvatarFile.type.startsWith("image/")) {
          setMessage({ text: "Only image files are supported for profile pictures.", type: "error" });
          return;
        }

        if (selectedAvatarFile.size > MAX_AVATAR_SIZE_BYTES) {
          setMessage({ text: "Profile pictures must be 1MB or smaller.", type: "error" });
          return;
        }

        const supabase = createClient();
        const extension = selectedAvatarFile.name.split(".").pop()?.toLowerCase() || "png";
        const filePath = `${profile.id}/avatar-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, selectedAvatarFile, {
            cacheControl: "3600",
            contentType: selectedAvatarFile.type,
          });

        if (uploadError) {
          setMessage({ text: uploadError.message, type: "error" });
          return;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        avatarUrl = data.publicUrl;
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          avatarUrl,
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          username: formData.get("username"),
          universityId: formData.get("universityId"),
          bio: formData.get("bio"),
        }),
      });

      const data = await response.json();
      setMessage({ text: data.message, type: data.status });

      if (data.status === "success") {
        setSelectedAvatarFile(null);
        setAvatarPreviewUrl(avatarUrl);
        router.refresh();
      }
    } catch {
      setMessage({ text: "Could not reach the server.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {message?.type === "success" && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)] rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg shadow-emerald-950/10 backdrop-blur transition-all duration-200 ease-out motion-reduce:transition-none ${
            isToastVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
          role="status"
          aria-live="polite"
        >
          {message.text}
        </div>
      )}

      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">Your details</CardTitle>
          <CardDescription>
            Update your profile details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message?.type === "error" && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-3 md:col-span-2">
              <Label htmlFor="avatar">Profile picture</Label>
              <div className="flex flex-col gap-4 rounded-lg border border-border/70 bg-secondary/20 p-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-background">
                  {avatarPreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="Profile picture preview"
                      className="h-full w-full object-cover"
                      src={avatarPreviewUrl}
                    />
                  ) : (
                    <span className="text-xl font-semibold text-muted-foreground">
                      {profile?.first_name?.charAt(0) ?? "A"}
                    </span>
                  )}
                </div>

                <div className="grid flex-1 gap-2">
                  <Input
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSelectedAvatarFile(file);

                      if (!file) {
                        setAvatarPreviewUrl(profile?.avatar_url ?? "");
                        return;
                      }

                      if (!file.type.startsWith("image/")) {
                        setMessage({ text: "Only image files are supported for profile pictures.", type: "error" });
                        event.target.value = "";
                        setSelectedAvatarFile(null);
                        setAvatarPreviewUrl(profile?.avatar_url ?? "");
                        return;
                      }

                      if (file.size > MAX_AVATAR_SIZE_BYTES) {
                        setMessage({ text: "Profile pictures must be 1MB or smaller.", type: "error" });
                        event.target.value = "";
                        setSelectedAvatarFile(null);
                        setAvatarPreviewUrl(profile?.avatar_url ?? "");
                        return;
                      }

                      setMessage(null);
                      setAvatarPreviewUrl(URL.createObjectURL(file));
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    Max size is 1MB. Only image files are supported.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={profile?.first_name ?? ""}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={profile?.last_name ?? ""}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                defaultValue={profile?.username ?? ""}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="universityId">University</Label>
              <select
                id="universityId"
                name="universityId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                defaultValue={profile?.university_id?.toString() ?? ""}
              >
                <option value="">Select your university</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Tell other students a little about yourself."
                defaultValue={profile?.bio ?? ""}
                className="h-32 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-border/70 pt-6">
            <PillButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </PillButton>
          </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
