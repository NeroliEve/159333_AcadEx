"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
import { createClient } from "@/lib/supabase/client";

type AccountSecurityFormProps = {
  email: string;
};

type FormMessage = {
  text: string;
  type: "success" | "error";
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getPasswordErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Could not update password.";
  }

  if (
    error.message.includes("Current password required") ||
    error.message.includes("invalid_credentials")
  ) {
    return "Your current password is incorrect.";
  }

  return error.message;
}

export function AccountSecurityForm({ email }: AccountSecurityFormProps) {
  const router = useRouter();
  const [currentEmail, setCurrentEmail] = useState(email);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [nextEmail, setNextEmail] = useState(email);
  const [emailMessage, setEmailMessage] = useState<FormMessage | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<FormMessage | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);
  const toastTransitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentEmail(email);
    setNextEmail(email);
    setPendingEmail(null);
  }, [email]);

  useEffect(() => {
    if (!toastMessage) {
      setIsToastVisible(false);

      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }

      return;
    }

    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    if (toastTransitionTimeoutRef.current) {
      window.clearTimeout(toastTransitionTimeoutRef.current);
    }

    setIsToastVisible(false);

    requestAnimationFrame(() => {
      setIsToastVisible(true);
    });

    toastTimeoutRef.current = window.setTimeout(() => {
      setIsToastVisible(false);

      toastTransitionTimeoutRef.current = window.setTimeout(() => {
        setToastMessage(null);
        toastTransitionTimeoutRef.current = null;
      }, 180);

      toastTimeoutRef.current = null;
    }, 3000);

    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }

      if (toastTransitionTimeoutRef.current) {
        window.clearTimeout(toastTransitionTimeoutRef.current);
        toastTransitionTimeoutRef.current = null;
      }
    };
  }, [toastMessage]);

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = nextEmail.trim();
    setEmailMessage(null);

    if (!trimmedEmail) {
      setEmailMessage({ text: "Email is required.", type: "error" });
      return;
    }

    if (normalizeEmail(trimmedEmail) === normalizeEmail(currentEmail)) {
      setEmailMessage({
        text: "Enter a different email address to update it.",
        type: "error",
      });
      return;
    }

    setIsEmailSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({ email: trimmedEmail });

      if (error) {
        throw error;
      }

      const updatedEmail = data.user?.email?.trim();

      if (updatedEmail && normalizeEmail(updatedEmail) === normalizeEmail(trimmedEmail)) {
        setCurrentEmail(updatedEmail);
        setNextEmail(updatedEmail);
        setPendingEmail(null);
        setEmailMessage(null);
        setToastMessage("Email updated successfully.");
        router.refresh();
      } else {
        setPendingEmail(trimmedEmail);
        setEmailMessage(null);
        setToastMessage(
          "Check your current and new email inboxes to confirm this change.",
        );
      }
    } catch (error: unknown) {
      setEmailMessage({
        text: error instanceof Error ? error.message : "Could not update email.",
        type: "error",
      });
    } finally {
      setIsEmailSubmitting(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordMessage(null);

    if (!currentPassword) {
      setPasswordMessage({
        text: "Enter your current password.",
        type: "error",
      });
      return;
    }

    if (password.length < 8) {
      setPasswordMessage({
        text: "Password must be at least 8 characters.",
        type: "error",
      });
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMessage({
        text: "Passwords do not match.",
        type: "error",
      });
      return;
    }

    setIsPasswordSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        current_password: currentPassword,
        password,
      });

      if (error) {
        throw error;
      }

      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setPasswordMessage(null);
      setToastMessage("Password updated successfully.");
    } catch (error: unknown) {
      setPasswordMessage({
        text: getPasswordErrorMessage(error),
        type: "error",
      });
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  return (
    <>
      {toastMessage ? (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)] rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg shadow-emerald-950/10 backdrop-blur transition-all duration-200 ease-out motion-reduce:transition-none ${
            isToastVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
          role="status"
          aria-live="polite"
        >
          {toastMessage}
        </div>
      ) : null}

      <Card className="border-border/70">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">Account security</CardTitle>
        <CardDescription>
          Update the email address and password you use to sign in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Email address</h3>
            <p className="text-sm text-muted-foreground">
              Current email: <span className="font-medium text-foreground">{currentEmail}</span>
            </p>
            {pendingEmail && (
              <p className="text-sm text-muted-foreground">
                Pending confirmation:{" "}
                <span className="font-medium text-foreground">{pendingEmail}</span>
              </p>
            )}
          </div>

          {emailMessage?.type === "error" && (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {emailMessage.text}
            </div>
          )}

          <div className="grid gap-2 md:max-w-md">
            <Label htmlFor="security-email">New email</Label>
            <Input
              id="security-email"
              type="email"
              autoComplete="email"
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
              required
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Email changes may require confirmation from both your current and new
            addresses before they take effect.
          </p>

          <div className="flex justify-end border-t border-border/70 pt-4">
            <PillButton type="submit" disabled={isEmailSubmitting}>
              {isEmailSubmitting ? "Updating..." : "Change email"}
            </PillButton>
          </div>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="space-y-4 border-t border-border/70 pt-8"
        >
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Password</h3>
            <p className="text-sm text-muted-foreground">
              Enter your current password, then choose a new password with at
              least 8 characters.
            </p>
          </div>

          {passwordMessage?.type === "error" && (
            <div
              className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {passwordMessage.text}
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid gap-2 md:max-w-md">
              <Label htmlFor="security-current-password">Current password</Label>
              <Input
                id="security-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="security-password">New password</Label>
              <Input
                id="security-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="security-confirm-password">Confirm password</Label>
              <Input
                id="security-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-border/70 pt-4">
            <PillButton type="submit" disabled={isPasswordSubmitting}>
              {isPasswordSubmitting ? "Updating..." : "Change password"}
            </PillButton>
          </div>
        </form>
      </CardContent>
      </Card>
    </>
  );
}
