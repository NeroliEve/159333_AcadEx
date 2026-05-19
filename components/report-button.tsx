"use client";

import { useState } from "react";

import { REPORT_REASONS, type ReportTargetKind } from "@/lib/reports";

type ReportButtonProps = {
  targetKind: ReportTargetKind;
  targetId: string;
  label?: string;
  variant?: "link" | "button";
  className?: string;
};

export function ReportButton({
  targetKind,
  targetId,
  label = "Report",
  variant = "link",
  className,
}: ReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function reset() {
    setReason("");
    setDescription("");
    setError(null);
    setIsSubmitted(false);
  }

  async function handleSubmit() {
    if (!reason) {
      setError("Choose a reason.");
      return;
    }
    if (reason === "other" && !description.trim()) {
      setError("Please add a description when selecting Other.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetKind, targetId, reason, description }),
    });

    const json = await res.json();
    setIsLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Could not submit your report.");
      return;
    }

    setIsSubmitted(true);
  }

  function closeModal() {
    setIsOpen(false);
    // Reset after the close animation finishes so the user doesn't see the
    // confirmation text flicker back to the form during dismissal.
    setTimeout(reset, 200);
  }

  const triggerClass =
    variant === "button"
      ? "inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      : "text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-destructive";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${triggerClass} ${className ?? ""}`}
      >
        {label}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="absolute inset-0" onClick={() => !isLoading && closeModal()} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border/70 bg-background shadow-2xl">
            <div className="border-b border-border/70 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight">
                {isSubmitted ? "Report submitted" : `Report this ${targetKind}`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSubmitted
                  ? "Thanks for letting us know. An admin will review this shortly."
                  : "Help keep AcadEx safe. Reports are private and only visible to admins."}
              </p>
            </div>

            {isSubmitted ? (
              <div className="flex items-center justify-end gap-2 border-t border-border/70 px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-4 px-6 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="report-reason">
                      Reason
                    </label>
                    <select
                      id="report-reason"
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    >
                      <option value="">Select a reason…</option>
                      {REPORT_REASONS.map((entry) => (
                        <option key={entry.value} value={entry.value}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="report-description">
                      Description {reason === "other" ? "(required)" : "(optional)"}
                    </label>
                    <textarea
                      id="report-description"
                      rows={4}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Add any extra detail that helps moderators understand the issue."
                    />
                  </div>

                  {error ? <p className="text-sm text-destructive">{error}</p> : null}
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-border/70 px-6 py-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isLoading}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading || !reason}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoading ? "Submitting…" : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
