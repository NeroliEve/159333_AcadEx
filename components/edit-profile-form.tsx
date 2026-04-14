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

type EditProfileFormProps = {
  profile: (ViewerProfile & { bio?: string | null }) | null;
  universities: UniversityOption[];
};

export function EditProfileForm({
  profile,
  universities,
}: EditProfileFormProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdminEnabled, setIsAdminEnabled] = useState(profile?.role === "admin");
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
    if (pathname !== "/profile") {
      setMessage(null);
    }
  }, [pathname]);

  useEffect(() => {
    setIsAdminEnabled(profile?.role === "admin");
  }, [profile?.role]);

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
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName"),
          username: formData.get("username"),
          universityId: formData.get("universityId"),
          bio: formData.get("bio"),
          role: formData.get("isAdmin") === "on" ? "admin" : "user",
        }),
      });

      const data = await response.json();
      setMessage({ text: data.message, type: data.status });

      if (data.status === "success") {
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

            <div className="grid gap-3 md:col-span-2">
              <div className="rounded-xl border border-border/70 bg-secondary/35 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="isAdmin">Admin testing access</Label>
                    <p className="text-sm text-muted-foreground">
                      Turn this on to give your current signed-in account admin
                      permissions across the app in this testing environment.
                    </p>
                  </div>

                  <label
                    htmlFor="isAdmin"
                    className="flex items-center gap-3 rounded-full border border-border/70 bg-background px-3 py-2 text-sm font-medium"
                  >
                    <input
                      id="isAdmin"
                      name="isAdmin"
                      type="checkbox"
                      className="h-4 w-4 accent-foreground"
                      checked={isAdminEnabled}
                      onChange={(event) => setIsAdminEnabled(event.target.checked)}
                    />
                    <span>{isAdminEnabled ? "Admin enabled" : "Admin disabled"}</span>
                  </label>
                </div>
              </div>
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
