"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminStatsPanel } from "@/components/admin-stats-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PillButton } from "@/components/ui/pill-button";
import {
  adminTabStorageKey,
  adminTabs as tabs,
  buildAdminTabHref,
  parseAdminTab,
  type AdminTab,
} from "@/lib/admin-tabs";
import type {
  AdminAuditRecord,
  AdminListingRecord,
  AdminOverviewStats,
  AdminReportRecord,
  AdminUserRecord,
} from "@/lib/admin";
import type { ApiResponse } from "@/lib/api";
import type {
  AdminCourse,
  AdminDegree,
  StudyAreaOption,
  UniversityOption,
} from "@/lib/marketplace";

type AdminModerationPanelProps = {
  auditLogs?: AdminAuditRecord[];
  courses?: AdminCourse[];
  degrees?: AdminDegree[];
  listings?: AdminListingRecord[];
  overview?: AdminOverviewStats;
  reports?: AdminReportRecord[];
  studyAreas?: StudyAreaOption[];
  universities?: UniversityOption[];
  users?: AdminUserRecord[];
};

type FeedbackState = {
  text: string;
  type: "error" | "success";
} | null;

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPersonName(
  person:
    | Pick<AdminUserRecord, "email" | "first_name" | "last_name" | "username">
    | { email?: string | null; first_name?: string | null; last_name?: string | null; username?: string | null }
    | null
    | undefined,
) {
  if (!person) return "Unknown user";

  const fullName = `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim();
  if (fullName) return fullName;
  if (person.username) return person.username;
  return person.email ?? "Unknown user";
}

function formatCurrency(value: number | null) {
  if (value == null) return "Price on request";

  return new Intl.NumberFormat("en-NZ", {
    currency: "NZD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function getBadgeClassName(tone: "default" | "success" | "warning") {
  if (tone === "success") {
    return "rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-900";
  }

  if (tone === "warning") {
    return "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-900";
  }

  return "rounded-full border border-border/70 bg-secondary/70 px-3 py-1 text-foreground";
}

function getAdminTabLoadingLabel(tab: AdminTab) {
  switch (tab) {
    case "audit":
      return "Loading audit logs...";
    case "catalog":
      return "Loading catalog...";
    case "listings":
      return "Loading listings...";
    case "overview":
      return "Loading reports...";
    case "reports":
      return "Loading reports...";
    case "users":
      return "Loading users...";
  }
}

const emptyOverview: AdminOverviewStats = {
  activeAdmins: 0,
  hiddenListings: 0,
  pendingReports: 0,
  suspendedUsers: 0,
  unverifiedUsers: 0,
};

const emptyAuditLogs: AdminAuditRecord[] = [];
const emptyCourses: AdminCourse[] = [];
const emptyDegrees: AdminDegree[] = [];
const emptyListings: AdminListingRecord[] = [];
const emptyReports: AdminReportRecord[] = [];
const emptyStudyAreas: StudyAreaOption[] = [];
const emptyUniversities: UniversityOption[] = [];
const emptyUsers: AdminUserRecord[] = [];

type AdminWorkspacePayload = {
  auditLogs?: AdminAuditRecord[];
  courses?: AdminCourse[];
  degrees?: AdminDegree[];
  listings?: AdminListingRecord[];
  newestPendingReports?: AdminReportRecord[];
  overview?: AdminOverviewStats;
  reports?: AdminReportRecord[];
  studyAreas?: StudyAreaOption[];
  universities?: UniversityOption[];
  users?: AdminUserRecord[];
};

export function AdminModerationPanel({
  auditLogs: initialAuditLogs = emptyAuditLogs,
  courses: initialCourses = emptyCourses,
  degrees: initialDegrees = emptyDegrees,
  listings: initialListings = emptyListings,
  overview: initialOverview = emptyOverview,
  reports: initialReports = emptyReports,
  studyAreas: initialStudyAreas = emptyStudyAreas,
  universities: initialUniversities = emptyUniversities,
  users: initialUsers = emptyUsers,
}: AdminModerationPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabSearchParam = searchParams.get("tab");
  const urlTab = parseAdminTab(tabSearchParam);
  const [activeTab, setActiveTab] = useState<AdminTab>(urlTab);
  const [overviewData, setOverviewData] = useState(initialOverview);
  const [users, setUsers] = useState(initialUsers);
  const [listings, setListings] = useState(initialListings);
  const [reports, setReports] = useState(initialReports);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [courses, setCourses] = useState(initialCourses);
  const [degrees, setDegrees] = useState(initialDegrees);
  const [studyAreas, setStudyAreas] = useState(initialStudyAreas);
  const [universities, setUniversities] = useState(initialUniversities);
  const [loadedTabs, setLoadedTabs] = useState<Set<AdminTab>>(
    () =>
      new Set(
        [
          initialReports.length > 0 ? "overview" : null,
          initialUsers.length > 0 ? "users" : null,
          initialListings.length > 0 ? "listings" : null,
          initialAuditLogs.length > 0 ? "audit" : null,
          initialCourses.length > 0 ||
          initialDegrees.length > 0 ||
          initialStudyAreas.length > 0 ||
          initialUniversities.length > 0
            ? "catalog"
            : null,
        ].filter(Boolean) as AdminTab[],
      ),
  );
  const [loadingTab, setLoadingTab] = useState<AdminTab | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [managedUserId, setManagedUserId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [listingQuery, setListingQuery] = useState("");
  const [listingVisibilityFilter, setListingVisibilityFilter] = useState("all");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [userNotes, setUserNotes] = useState<Record<string, string>>({});
  const [listingNotes, setListingNotes] = useState<Record<string, string>>({});
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const toastTimeoutRef = useRef<number | null>(null);
  const toastTransitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveTab(urlTab);
  }, [urlTab, tabSearchParam]);

  useEffect(() => {
    if (tabSearchParam) return;

    const storedTab = parseAdminTab(window.localStorage.getItem(adminTabStorageKey));
    if (storedTab === "overview") return;

    setActiveTab(storedTab);
    window.history.replaceState(
      null,
      "",
      buildAdminTabHref(pathname, searchParams.toString(), storedTab),
    );
  }, [pathname, searchParams, tabSearchParam]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    setListings(initialListings);
  }, [initialListings]);

  useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  useEffect(() => {
    setAuditLogs(initialAuditLogs);
  }, [initialAuditLogs]);

  useEffect(() => {
    setOverviewData(initialOverview);
  }, [initialOverview]);

  useEffect(() => {
    setCourses(initialCourses);
  }, [initialCourses]);

  useEffect(() => {
    setDegrees(initialDegrees);
  }, [initialDegrees]);

  useEffect(() => {
    setStudyAreas(initialStudyAreas);
  }, [initialStudyAreas]);

  useEffect(() => {
    setUniversities(initialUniversities);
  }, [initialUniversities]);

  useEffect(() => {
    if (loadedTabs.has(activeTab)) return;

    let cancelled = false;

    async function loadTabData() {
      setLoadingTab(activeTab);
      setLoadError(null);

      try {
        const response = await fetch(`/api/admin/workspace?tab=${activeTab}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ApiResponse<AdminWorkspacePayload>;

        if (cancelled) return;

        if (!response.ok || payload.status === "error") {
          setLoadError(
            payload.status === "error"
              ? payload.message
              : "Could not load admin data.",
          );
          return;
        }

        if (payload.data.overview) {
          setOverviewData(payload.data.overview);
        }
        if (payload.data.newestPendingReports) {
          setReports(payload.data.newestPendingReports);
        }
        if (payload.data.users) {
          setUsers(payload.data.users);
        }
        if (payload.data.listings) {
          setListings(payload.data.listings);
        }
        if (payload.data.reports) {
          setReports(payload.data.reports);
        }
        if (payload.data.auditLogs) {
          setAuditLogs(payload.data.auditLogs);
        }
        if (payload.data.courses) {
          setCourses(payload.data.courses);
        }
        if (payload.data.degrees) {
          setDegrees(payload.data.degrees);
        }
        if (payload.data.studyAreas) {
          setStudyAreas(payload.data.studyAreas);
        }
        if (payload.data.universities) {
          setUniversities(payload.data.universities);
        }

        setLoadedTabs((current) => new Set(current).add(activeTab));
      } catch {
        if (!cancelled) {
          setLoadError("Could not reach the admin workspace endpoint.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTab(null);
        }
      }
    }

    void loadTabData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, loadedTabs]);

  useEffect(() => {
    if (!feedback) {
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
        setFeedback(null);
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
  }, [feedback]);

  const activeAdmins = useMemo(
    () =>
      users.filter(
        (user) => user.role === "admin" && user.account_status === "active",
      ),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();

    return users.filter((user) => {
      if (
        query &&
        ![
          user.email ?? "",
          user.first_name,
          user.last_name,
          user.university ?? "",
          user.username,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      if (userRoleFilter !== "all" && user.role !== userRoleFilter) {
        return false;
      }

      if (userStatusFilter !== "all" && user.account_status !== userStatusFilter) {
        return false;
      }

      return true;
    });
  }, [userQuery, userRoleFilter, userStatusFilter, users]);

  const verificationUsers = useMemo(
    () => users.filter((user) => !user.is_verified),
    [users],
  );
  const initialUsersById = useMemo(
    () => new Map(initialUsers.map((user) => [user.id, user])),
    [initialUsers],
  );
  const managedUser = useMemo(
    () => users.find((user) => user.id === managedUserId) ?? null,
    [managedUserId, users],
  );

  const filteredListings = useMemo(() => {
    const query = listingQuery.trim().toLowerCase();

    return listings.filter((listing) => {
      if (
        query &&
        ![
          listing.title,
          listing.seller?.email ?? "",
          listing.seller?.username ?? "",
          formatPersonName(listing.seller),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      if (listingVisibilityFilter === "hidden" && !listing.deleted_at) {
        return false;
      }

      if (
        listingVisibilityFilter === "visible" &&
        (listing.deleted_at || listing.status === "archived" || listing.archived_at)
      ) {
        return false;
      }

      if (
        listingVisibilityFilter === "archived" &&
        listing.status !== "archived" &&
        !listing.archived_at
      ) {
        return false;
      }

      return true;
    });
  }, [listingQuery, listingVisibilityFilter, listings]);

  const filteredReports = useMemo(
    () =>
      reports.filter((report) =>
        reportStatusFilter === "all" ? true : report.status === reportStatusFilter,
      ),
    [reportStatusFilter, reports],
  );

  const newestPendingReports = useMemo(
    () =>
      reports
        .filter((report) => report.status === "pending")
        .slice(0, 5),
    [reports],
  );
  const isActiveTabLoading = loadingTab === activeTab;

  function openReport(reportId: string) {
    setReportStatusFilter("pending");
    selectTab("reports");

    window.setTimeout(() => {
      document
        .getElementById(`admin-report-${reportId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function selectTab(tab: AdminTab) {
    const href = buildAdminTabHref(pathname, searchParams.toString(), tab);

    setActiveTab(tab);
    window.localStorage.setItem(adminTabStorageKey, tab);
    window.history.replaceState(null, "", href);
  }

  async function handleJsonResponse(response: Response) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      status?: "error" | "success";
      error?: string;
      listing?: AdminListingRecord;
      report?: AdminReportRecord;
      user?: AdminUserRecord;
    };

    if (!response.ok || payload.status === "error") {
      throw new Error(payload.message ?? payload.error ?? "Request failed.");
    }

    return payload;
  }

  async function saveUser(
    userId: string,
    nextUser?: Partial<AdminUserRecord>,
    options?: { closeOnSuccess?: boolean },
  ) {
    const currentUser = users.find((user) => user.id === userId);
    if (!currentUser) return;

    const mergedUser = { ...currentUser, ...nextUser };
    const baselineUser = initialUsersById.get(userId) ?? currentUser;
    const notes = userNotes[userId]?.trim() ?? "";
    const hasProfileChanges =
      baselineUser.first_name !== mergedUser.first_name ||
      baselineUser.last_name !== mergedUser.last_name ||
      baselineUser.username !== mergedUser.username ||
      (baselineUser.bio ?? "") !== (mergedUser.bio ?? "") ||
      baselineUser.university_id !== mergedUser.university_id ||
      baselineUser.role !== mergedUser.role ||
      baselineUser.account_status !== mergedUser.account_status ||
      baselineUser.is_verified !== mergedUser.is_verified;

    if (!hasProfileChanges) {
      setFeedback({ text: "No changes to save.", type: "error" });
      return;
    }

    if (
      !mergedUser.first_name.trim() ||
      !mergedUser.last_name.trim() ||
      !mergedUser.username.trim()
    ) {
      setFeedback({
        text: "First name, last name, and username are required.",
        type: "error",
      });
      return;
    }

    if (
      (baselineUser.role !== mergedUser.role ||
        baselineUser.account_status !== mergedUser.account_status ||
        baselineUser.is_verified !== mergedUser.is_verified) &&
      !notes
    ) {
      setFeedback({
        text: "A moderation note is required to change roles, verification, or account status.",
        type: "error",
      });
      return;
    }

    setPendingKey(`user-${userId}`);

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        body: JSON.stringify({
          accountStatus: mergedUser.account_status,
          bio: mergedUser.bio ?? "",
          firstName: mergedUser.first_name,
          isVerified: mergedUser.is_verified,
          lastName: mergedUser.last_name,
          notes,
          role: mergedUser.role,
          universityId: mergedUser.university_id ?? "",
          username: mergedUser.username,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      const payload = await handleJsonResponse(response);
      if (payload.user) {
        setUsers((current) =>
          current.map((user) => (user.id === userId ? (payload.user as AdminUserRecord) : user)),
        );
      }
      setUserNotes((current) => ({ ...current, [userId]: "" }));
      if (options?.closeOnSuccess) {
        setManagedUserId(null);
      }
      setFeedback({ text: payload.message ?? "User updated.", type: "success" });
      router.refresh();
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not update this user.",
        type: "error",
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function moderateListing(
    listingId: string,
    action: "hide" | "restore" | "status",
    status?: AdminListingRecord["status"],
  ) {
    setPendingKey(`listing-${listingId}-${action}`);

    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        body: JSON.stringify({
          action,
          notes: listingNotes[listingId] ?? "",
          status,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      const payload = await handleJsonResponse(response);
      if (payload.listing) {
        setListings((current) =>
          current.map((listing) =>
            listing.id === listingId
              ? { ...listing, ...(payload.listing as Partial<AdminListingRecord>) }
              : listing,
          ),
        );
      }
      if (action !== "status") {
        setListingNotes((current) => ({ ...current, [listingId]: "" }));
      }
      setFeedback({ text: payload.message ?? "Listing updated.", type: "success" });
      router.refresh();
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not update this listing.",
        type: "error",
      });
    } finally {
      setPendingKey(null);
    }
  }

  async function updateReport(reportId: string, status: AdminReportRecord["status"]) {
    setPendingKey(`report-${reportId}`);

    try {
      const response = await fetch(`/api/admin/reports/${reportId}`, {
        body: JSON.stringify({
          notes: reportNotes[reportId] ?? "",
          status,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      const payload = await handleJsonResponse(response);
      if (payload.report) {
        setReports((current) =>
          current.map((report) =>
            report.id === reportId
              ? { ...report, ...(payload.report as Partial<AdminReportRecord>) }
              : report,
          ),
        );
      }
      setReportNotes((current) => ({ ...current, [reportId]: "" }));
      setFeedback({ text: payload.message ?? "Report updated.", type: "success" });
      router.refresh();
    } catch (error) {
      setFeedback({
        text: error instanceof Error ? error.message : "Could not update this report.",
        type: "error",
      });
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <>
      {feedback ? (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)] rounded-full px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition-all duration-200 ease-out motion-reduce:transition-none ${
            feedback.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900 shadow-emerald-950/10"
              : "border border-destructive/20 bg-destructive/5 text-destructive shadow-destructive/10"
          } ${
            isToastVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
          role="status"
          aria-live="polite"
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <PillButton
            key={tab.id}
            asChild
            variant={activeTab === tab.id ? "primary" : "secondary"}
          >
            <a
              href={buildAdminTabHref(pathname, searchParams.toString(), tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                selectTab(tab.id);
              }}
            >
              {tab.label}
            </a>
          </PillButton>
        ))}
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      {isActiveTabLoading ? (
        <div className="flex h-24 items-center px-5 text-sm text-muted-foreground animate-pulse rounded-xl border border-border/70 bg-muted/40">
          {getAdminTabLoadingLabel(activeTab)}
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Pending reports</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {overviewData.pendingReports}
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Suspended users</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {overviewData.suspendedUsers}
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Unverified users</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {overviewData.unverifiedUsers}
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Hidden listings</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {overviewData.hiddenListings}
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Active admins</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {overviewData.activeAdmins}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle>Newest pending reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {newestPendingReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col gap-4 rounded-xl border border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {report.report_type} report
                      </p>
                      <p className="text-sm text-muted-foreground">{report.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(report.created_at)}
                      </p>
                    </div>
                    <PillButton
                      type="button"
                      variant="secondary"
                      onClick={() => openReport(report.id)}
                    >
                      View
                    </PillButton>
                  </div>
                ))}
                {isActiveTabLoading ? (
                  <p className="text-sm text-muted-foreground">Loading reports...</p>
                ) : newestPendingReports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No pending reports.</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 pt-4">
            <div className="border-t border-border/70 pt-6">
              <h2 className="text-xl font-semibold tracking-tight">AcadEx exchange statistics</h2>
              <p className="text-sm text-muted-foreground">
                Live insights from completed exchanges across the platform.
              </p>
            </div>
            <AdminStatsPanel />
          </div>
        </div>
      ) : null}

      {activeTab === "users" ? (
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardContent className="grid gap-4 p-6 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="user-query">Search users</Label>
                <Input
                  id="user-query"
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Name, username, email, university"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-role-filter">Role</Label>
                <select
                  id="user-role-filter"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={userRoleFilter}
                  onChange={(event) => setUserRoleFilter(event.target.value)}
                >
                  <option value="all">All roles</option>
                  <option value="user">Users</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="user-status-filter">Account status</Label>
                <select
                  id="user-status-filter"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={userStatusFilter}
                  onChange={(event) => setUserStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm">
                <p className="font-medium">{filteredUsers.length} users shown</p>
                <p className="text-muted-foreground">{activeAdmins.length} active admins</p>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-2xl border border-border/70">
            {isActiveTabLoading ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.map((user, index) => (
              <div
                key={user.id}
                className={`flex flex-col gap-4 bg-background px-5 py-4 lg:flex-row lg:items-center lg:justify-between ${
                  index === 0 ? "" : "border-t border-border/70"
                }`}
              >
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary/30">
                    {user.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`${formatPersonName(user)} profile picture`}
                        className="h-full w-full object-cover"
                        src={user.avatar_url}
                      />
                    ) : (
                      <span className="text-base font-semibold text-muted-foreground">
                        {formatPersonName(user).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 space-y-2">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">{formatPersonName(user)}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {user.email ?? "Email unavailable"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username} {user.university ? `• ${user.university}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={getBadgeClassName(user.role === "admin" ? "warning" : "default")}>
                        {user.role}
                      </span>
                      <span
                        className={getBadgeClassName(
                          user.account_status === "active" ? "success" : "warning",
                        )}
                      >
                        {user.account_status}
                      </span>
                      <span
                        className={getBadgeClassName(
                          user.is_verified ? "success" : "default",
                        )}
                      >
                        {user.is_verified ? "verified" : "unverified"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 lg:justify-end">
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDateTime(user.updated_at)}
                  </p>
                  <PillButton type="button" onClick={() => setManagedUserId(user.id)}>
                    Manage
                  </PillButton>
                </div>
              </div>
            ))}
            {!isActiveTabLoading && filteredUsers.length === 0 ? (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                No users match the current filters.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {managedUser ? (() => {
        const baselineUser = initialUsersById.get(managedUser.id) ?? managedUser;
        const noteRequired =
          baselineUser.role !== managedUser.role ||
          baselineUser.account_status !== managedUser.account_status ||
          baselineUser.is_verified !== managedUser.is_verified;

        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-8">
            <div className="absolute inset-0" onClick={() => setManagedUserId(null)} />
            <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-border/70 bg-background shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-5">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-secondary/30">
                    {managedUser.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={`${formatPersonName(managedUser)} profile picture`}
                        className="h-full w-full object-cover"
                        src={managedUser.avatar_url}
                      />
                    ) : (
                      <span className="text-lg font-semibold text-muted-foreground">
                        {formatPersonName(managedUser).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-xl font-semibold">{formatPersonName(managedUser)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {managedUser.email ?? "Email unavailable"}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className={getBadgeClassName(managedUser.role === "admin" ? "warning" : "default")}>
                        {managedUser.role}
                      </span>
                      <span
                        className={getBadgeClassName(
                          managedUser.account_status === "active" ? "success" : "warning",
                        )}
                      >
                        {managedUser.account_status}
                      </span>
                      <span
                        className={getBadgeClassName(
                          managedUser.is_verified ? "success" : "default",
                        )}
                      >
                        {managedUser.is_verified ? "verified" : "unverified"}
                      </span>
                    </div>
                  </div>
                </div>
                <PillButton type="button" variant="secondary" onClick={() => setManagedUserId(null)}>
                  Close
                </PillButton>
              </div>

              <div className="grid gap-6 px-6 py-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={managedUser.role}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((entry) =>
                            entry.id === managedUser.id
                              ? { ...entry, role: event.target.value as AdminUserRecord["role"] }
                              : entry,
                          ),
                        )
                      }
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Account status</Label>
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={managedUser.account_status}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((entry) =>
                            entry.id === managedUser.id
                              ? {
                                  ...entry,
                                  account_status: event.target.value as AdminUserRecord["account_status"],
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Verification</Label>
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={managedUser.is_verified ? "verified" : "unverified"}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((entry) =>
                            entry.id === managedUser.id
                              ? { ...entry, is_verified: event.target.value === "verified" }
                              : entry,
                          ),
                        )
                      }
                    >
                      <option value="verified">Verified</option>
                      <option value="unverified">Unverified</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>First name</Label>
                    <Input
                      value={managedUser.first_name}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((entry) =>
                            entry.id === managedUser.id
                              ? { ...entry, first_name: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Last name</Label>
                    <Input
                      value={managedUser.last_name}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((entry) =>
                            entry.id === managedUser.id
                              ? { ...entry, last_name: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Username</Label>
                    <Input
                      value={managedUser.username}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((entry) =>
                            entry.id === managedUser.id
                              ? { ...entry, username: event.target.value }
                              : entry,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>University</Label>
                    <select
                      className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                      value={managedUser.university_id?.toString() ?? ""}
                      onChange={(event) =>
                        setUsers((current) =>
                          current.map((entry) =>
                            entry.id === managedUser.id
                              ? {
                                  ...entry,
                                  university_id: event.target.value ? Number(event.target.value) : null,
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      <option value="">No university</option>
                      {universities.map((university) => (
                        <option key={university.id} value={university.id}>
                          {university.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={managedUser.bio ?? ""}
                    onChange={(event) =>
                      setUsers((current) =>
                        current.map((entry) =>
                          entry.id === managedUser.id
                            ? { ...entry, bio: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </div>

                {noteRequired ? (
                  <div className="grid gap-2">
                    <Label>Moderation note</Label>
                    <Textarea
                      placeholder="Required for role, verification, and suspension changes."
                      value={userNotes[managedUser.id] ?? ""}
                      onChange={(event) =>
                        setUserNotes((current) => ({
                          ...current,
                          [managedUser.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
                    Add a moderation note only if you change role, verification, or account status.
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-5">
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDateTime(managedUser.updated_at)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <PillButton
                      type="button"
                      variant="secondary"
                      disabled={pendingKey === `user-${managedUser.id}`}
                      onClick={() =>
                        saveUser(
                          managedUser.id,
                          { is_verified: !managedUser.is_verified },
                          { closeOnSuccess: true },
                        )
                      }
                    >
                      {managedUser.is_verified ? "Unverify" : "Verify"}
                    </PillButton>
                    <PillButton
                      type="button"
                      disabled={pendingKey === `user-${managedUser.id}`}
                      onClick={() => void saveUser(managedUser.id, undefined, { closeOnSuccess: true })}
                    >
                      {pendingKey === `user-${managedUser.id}` ? "Saving..." : "Save user"}
                    </PillButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {activeTab === "verification" ? (
        <div className="grid gap-4">
          {verificationUsers.map((user) => (
            <Card key={user.id} className="border-border/70">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{formatPersonName(user)}</p>
                  <p className="text-sm text-muted-foreground">
                    {user.email ?? "Email unavailable"}
                  </p>
                </div>
                <Textarea
                  placeholder="Add the verification reason or evidence reviewed."
                  value={userNotes[user.id] ?? ""}
                  onChange={(event) =>
                    setUserNotes((current) => ({
                      ...current,
                      [user.id]: event.target.value,
                    }))
                  }
                />
                <div className="flex justify-end">
                  <PillButton
                    type="button"
                    disabled={pendingKey === `user-${user.id}`}
                    onClick={() =>
                      void saveUser(user.id, {
                        is_verified: true,
                      })
                    }
                  >
                    Verify account
                  </PillButton>
                </div>
              </CardContent>
            </Card>
          ))}
          {verificationUsers.length === 0 ? (
            <Card className="border-border/70">
              <CardContent className="p-6 text-sm text-muted-foreground">
                No unverified users are currently queued.
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {activeTab === "listings" ? (
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardContent className="grid gap-4 p-6 md:grid-cols-[1.5fr_1fr_auto] md:items-end">
              <div className="grid gap-2">
                <Label htmlFor="listing-query">Search listings</Label>
                <Input
                  id="listing-query"
                  value={listingQuery}
                  onChange={(event) => setListingQuery(event.target.value)}
                  placeholder="Title, seller, email"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="listing-visibility">Visibility</Label>
                <select
                  id="listing-visibility"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={listingVisibilityFilter}
                  onChange={(event) => setListingVisibilityFilter(event.target.value)}
                >
                  <option value="all">All listings</option>
                  <option value="visible">Visible only</option>
                  <option value="hidden">Hidden only</option>
                  <option value="archived">Archived only</option>
                </select>
              </div>
              <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm">
                <p className="font-medium">{filteredListings.length} listings shown</p>
                <p className="text-muted-foreground">
                  {filteredListings.filter((listing) => listing.deleted_at).length} hidden /{" "}
                  {filteredListings.filter((listing) => listing.status === "archived" || listing.archived_at).length} archived
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="border-border/70">
                <CardContent className="space-y-5 p-5">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">{listing.title}</p>
                        <p className="text-sm text-muted-foreground">
                          Seller: {formatPersonName(listing.seller)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated {formatDateTime(listing.updated_at)}
                        </p>
                      </div>
                      <div className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-sm font-medium">
                        {formatCurrency(listing.price)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span
                        className={getBadgeClassName(
                          listing.deleted_at ? "warning" : "success",
                        )}
                      >
                        {listing.deleted_at ? "hidden" : "visible"}
                      </span>
                      <span className={getBadgeClassName("default")}>{listing.status}</span>
                      <span className={getBadgeClassName("default")}>{listing.listing_type}</span>
                    </div>

                    <div className="grid gap-3 rounded-xl border border-border/70 bg-secondary/20 p-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Condition
                        </p>
                        <p className="mt-1 font-medium">{listing.condition}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Seller profile
                        </p>
                        <p className="mt-1 font-medium">
                          {listing.seller?.username ? `@${listing.seller.username}` : "Unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <select
                          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                          value={listing.status}
                          onChange={(event) =>
                            setListings((current) =>
                              current.map((entry) =>
                                entry.id === listing.id
                                  ? {
                                      ...entry,
                                      status: event.target.value as AdminListingRecord["status"],
                                    }
                                  : entry,
                              ),
                            )
                          }
                        >
                          <option value="available">Available</option>
                          <option value="pending">Pending</option>
                          <option value="archived">Archived</option>
                        </select>
                      </div>
                      <PillButton
                        type="button"
                        variant="secondary"
                        disabled={pendingKey === `listing-${listing.id}-status`}
                        onClick={() => void moderateListing(listing.id, "status", listing.status)}
                      >
                        Save status
                      </PillButton>
                    </div>

                    <details className="rounded-xl border border-border/70 bg-background/60">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium">
                        Moderation details
                      </summary>
                      <div className="grid gap-4 border-t border-border/70 px-4 py-4">
                        <div className="grid gap-2">
                          <Label>Moderation note</Label>
                          <Textarea
                            placeholder="Required when hiding or restoring a listing."
                            value={listingNotes[listing.id] ?? ""}
                            onChange={(event) =>
                              setListingNotes((current) => ({
                                ...current,
                                [listing.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <PillButton asChild variant="secondary">
                            <Link href={`/listings/${listing.id}`}>Open listing</Link>
                          </PillButton>
                          <PillButton asChild variant="secondary">
                            <Link href={`/listings/${listing.id}/edit`}>Edit listing</Link>
                          </PillButton>
                          {listing.seller?.username ? (
                            <PillButton asChild variant="secondary">
                              <Link href={`/profile/${listing.seller.username}`}>Seller profile</Link>
                            </PillButton>
                          ) : null}
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-1">
                    <div className="text-xs text-muted-foreground">
                      Use hide or restore when moderation changes public visibility.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {listing.deleted_at ? (
                        <PillButton
                          type="button"
                          disabled={pendingKey === `listing-${listing.id}-restore`}
                          onClick={() => void moderateListing(listing.id, "restore")}
                        >
                          Restore listing
                        </PillButton>
                      ) : (
                        <PillButton
                          type="button"
                          variant="secondary"
                          disabled={pendingKey === `listing-${listing.id}-hide`}
                          onClick={() => void moderateListing(listing.id, "hide")}
                        >
                          Hide listing
                        </PillButton>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {isActiveTabLoading ? (
              <Card className="border-border/70 md:col-span-2 xl:col-span-3">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Loading listings...
                </CardContent>
              </Card>
            ) : filteredListings.length === 0 ? (
              <Card className="border-border/70 md:col-span-2 xl:col-span-3">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No listings match the current filters.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {activeTab === "reports" ? (
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardContent className="grid gap-4 p-6 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="report-status-filter">Report status</Label>
                <select
                  id="report-status-filter"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={reportStatusFilter}
                  onChange={(event) => setReportStatusFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {filteredReports.map((report) => (
              <Card
                key={report.id}
                id={`admin-report-${report.id}`}
                className="scroll-mt-6 border-border/70"
              >
                <CardContent className="space-y-4 p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">
                        {report.report_type} report
                      </p>
                      <p className="text-sm text-muted-foreground">{report.reason}</p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs">
                      {report.status}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-muted-foreground">
                    <p>
                      Reporter:{" "}
                      {report.reporter?.username ? (
                        <Link
                          href={`/profile/${report.reporter.username}`}
                          className="underline underline-offset-2 transition-colors hover:text-foreground"
                        >
                          {formatPersonName(report.reporter)}
                        </Link>
                      ) : (
                        formatPersonName(report.reporter)
                      )}
                    </p>
                    {report.reportedUser ? (
                      <p>
                        Reported user:{" "}
                        {report.reportedUser.username ? (
                          <Link
                            href={`/profile/${report.reportedUser.username}`}
                            className="underline underline-offset-2 transition-colors hover:text-foreground"
                          >
                            {formatPersonName(report.reportedUser)}
                          </Link>
                        ) : (
                          formatPersonName(report.reportedUser)
                        )}
                      </p>
                    ) : null}
                    {report.reportedListing ? (
                      <p>
                        Reported listing:{" "}
                        <Link
                          href={`/listings/${report.reportedListing.id}`}
                          className="underline underline-offset-2 transition-colors hover:text-foreground"
                        >
                          {report.reportedListing.title}
                        </Link>
                      </p>
                    ) : null}
                    {report.reportedConversation ? (
                      <p>
                        Reported conversation:{" "}
                        <Link
                          href={`/messages/${report.reportedConversation.id}`}
                          className="underline underline-offset-2 transition-colors hover:text-foreground"
                        >
                          Open conversation
                        </Link>
                      </p>
                    ) : null}
                    {report.reportedMessage ? (
                      <div className="space-y-2 rounded-lg border border-border/70 bg-secondary/30 p-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Reported message in context
                        </p>
                        <div className="space-y-1">
                          {(report.reportedMessage.context ?? []).map((msg) => {
                            const before = report.reportedMessage && msg.created_at < report.reportedMessage.created_at;
                            return (
                              <p
                                key={msg.id}
                                className={`text-xs ${before ? "text-muted-foreground" : "text-muted-foreground"}`}
                              >
                                <span className="font-medium">{before ? "← " : "→ "}</span>
                                {msg.content}
                              </p>
                            );
                          })}
                          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm">
                            <span className="font-medium">⚑ </span>
                            {report.reportedMessage.content}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {report.description ? <p>{report.description}</p> : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <select
                        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        value={report.status}
                        onChange={(event) =>
                          setReports((current) =>
                            current.map((entry) =>
                              entry.id === report.id
                                ? {
                                    ...entry,
                                    status: event.target.value as AdminReportRecord["status"],
                                  }
                                : entry,
                            ),
                          )
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <PillButton
                        type="button"
                        disabled={pendingKey === `report-${report.id}`}
                        onClick={() => void updateReport(report.id, report.status)}
                      >
                        Save report
                      </PillButton>
                    </div>
                  </div>

                  {report.resolution_note ? (
                    <div className="rounded-lg border border-border/70 bg-secondary/30 p-3 text-sm">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Last admin note (visible to reporter)
                      </p>
                      <p className="mt-1">{report.resolution_note}</p>
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    <Label htmlFor={`report-notes-${report.id}`}>
                      Admin note {report.status === "pending" ? "(optional)" : "(visible to reporter)"}
                    </Label>
                    <Textarea
                      id={`report-notes-${report.id}`}
                      placeholder="Explain what action was taken. Reporters see this on their My reports page."
                      value={reportNotes[report.id] ?? ""}
                      onChange={(event) =>
                        setReportNotes((current) => ({
                          ...current,
                          [report.id]: event.target.value,
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "audit" ? (
        <div className="grid gap-4">
          {auditLogs.map((entry) => (
            <Card key={entry.id} className="border-border/70">
              <CardContent className="space-y-2 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{entry.action_type}</p>
                    <p className="text-sm text-muted-foreground">
                      By {entry.admin ? formatPersonName(entry.admin) : "System (automated)"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Target: {entry.target_type} {entry.target_id}
                </p>
                {entry.notes ? (
                  <p className="text-sm">{entry.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No note provided.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {activeTab === "catalog" ? (
        <AdminDashboard
          courses={courses}
          degrees={degrees}
          isLoading={isActiveTabLoading}
          studyAreas={studyAreas}
          universities={universities}
        />
      ) : null}
      </div>
    </>
  );
}
