"use client";

import { useEffect, useRef, useState } from "react";

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
import type { ViewerProfile } from "@/lib/marketplace";

type EditProfileFormProps = {
  profile: (ViewerProfile & { bio?: string | null }) | null;
};

export function EditProfileForm({ profile }: EditProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setMessage(null);
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);

      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (message?.type !== "success") {
      return;
    }

    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
    }

    successTimeoutRef.current = window.setTimeout(() => {
      setMessage(null);
      successTimeoutRef.current = null;
    }, 5000);

    return () => {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
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
          university: formData.get("university"),
          bio: formData.get("bio"),
        }),
      });

      const data = await response.json();
      setMessage({ text: data.message, type: data.status });
    } catch {
      setMessage({ text: "Could not reach the server.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">Your details</CardTitle>
        <CardDescription>
          Update your name, username, and university.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-destructive/20 bg-destructive/5 text-destructive"
            }`}
          >
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
              <Label htmlFor="university">University</Label>
              <Input
                id="university"
                name="university"
                placeholder="e.g. University of Auckland"
                defaultValue={profile?.university ?? ""}
              />
            </div>

            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Tell other students a little about yourself."
                defaultValue={profile?.bio ?? ""}
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
  );
}
