import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getViewerContext } from "@/lib/marketplace";
import { getMyReports, type MyReportRow } from "@/lib/reports-server";

function nameOrUsername(p: { first_name?: string | null; last_name?: string | null; username?: string | null }) {
  const full = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return full || p.username || "User";
}

function statusClass(status: MyReportRow["status"]) {
  switch (status) {
    case "resolved":
      return "bg-green-100 text-green-800";
    case "dismissed":
      return "bg-zinc-200 text-zinc-700";
    case "reviewed":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}

function targetSummary(report: MyReportRow) {
  if (report.reportedListing) {
    return {
      label: "Listing",
      href: `/listings/${report.reportedListing.id}`,
      text: report.reportedListing.title,
    };
  }
  if (report.reportedUser) {
    return {
      label: "User",
      href: `/profile/${report.reportedUser.username}`,
      text: nameOrUsername(report.reportedUser),
    };
  }
  if (report.reported_conversation_id) {
    return {
      label: "Conversation",
      href: `/messages/${report.reported_conversation_id}`,
      text: "Open conversation",
    };
  }
  if (report.reported_message_id) {
    return { label: "Message", href: null, text: "(removed or no longer visible)" };
  }
  return { label: "Report", href: null, text: "—" };
}

async function MyReportsContent() {
  const { user } = await getViewerContext();
  if (!user) redirect("/auth/login");

  const reports = await getMyReports(user.id);

  return (
    <section className="flex flex-col gap-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Profile</p>
        <h1 className="text-3xl font-semibold tracking-tight">My reports</h1>
        <p className="text-sm text-muted-foreground">
          Reports you&apos;ve submitted, with their current status. Admins review every report.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          You haven&apos;t filed any reports.
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const target = targetSummary(report);
            return (
              <div
                key={report.id}
                className="space-y-3 rounded-xl border border-border/70 bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {target.label}
                    </p>
                    {target.href ? (
                      <Link
                        href={target.href}
                        className="text-sm font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                      >
                        {target.text}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">{target.text}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(report.status)}`}
                  >
                    {report.status}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Reason:</span> {report.reason}
                  </p>
                  {report.description ? (
                    <p className="text-muted-foreground">{report.description}</p>
                  ) : null}
                </div>

                {report.resolution_note ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wider text-primary">
                      Admin response
                    </p>
                    <p className="mt-1">{report.resolution_note}</p>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  Submitted{" "}
                  {new Date(report.created_at).toLocaleDateString("en-NZ", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {report.reviewed_at ? (
                    <>
                      {" · Reviewed "}
                      {new Date(report.reviewed_at).toLocaleDateString("en-NZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MyReportsFallback() {
  return (
    <section className="flex flex-col gap-8">
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
        ))}
      </div>
    </section>
  );
}

export default function MyReportsPage() {
  return (
    <Suspense fallback={<MyReportsFallback />}>
      <MyReportsContent />
    </Suspense>
  );
}
