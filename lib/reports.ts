export const REPORT_REASONS = [
  { value: "misleading_listing", label: "Misleading listing" },
  { value: "scam_or_suspicious", label: "Scam or suspicious behaviour" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "harassment_or_abuse", label: "Harassment or abuse" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((r) => r.value) as ReadonlyArray<ReportReason>;

export function isValidReportReason(value: string): value is ReportReason {
  return REPORT_REASON_VALUES.includes(value as ReportReason);
}

export type ReportTargetKind = "listing" | "user" | "message" | "conversation";
