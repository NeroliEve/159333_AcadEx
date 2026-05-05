import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/database.types";

export type ViewerAccessProfile = Pick<
  TableRow<"profiles">,
  | "account_status"
  | "avatar_url"
  | "bio"
  | "email"
  | "first_name"
  | "id"
  | "is_verified"
  | "last_name"
  | "role"
  | "suspended_at"
  | "university"
  | "university_id"
  | "username"
>;

export type ViewerAccessContext = {
  isAdmin: boolean;
  isSuspended: boolean;
  profile: ViewerAccessProfile | null;
  profileId: string | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string | null;
};

export type AdminActionLogInput = {
  actionType: string;
  adminId: string;
  notes?: string | null;
  targetId: string;
  targetType: string;
};

type AdminUserBase = Pick<
  TableRow<"profiles">,
  | "account_status"
  | "avatar_url"
  | "bio"
  | "email"
  | "first_name"
  | "id"
  | "is_verified"
  | "last_name"
  | "role"
  | "suspended_at"
  | "university"
  | "university_id"
  | "updated_at"
  | "username"
>;

export type AdminUserRecord = AdminUserBase;

export type AdminListingRecord = Pick<
  TableRow<"listings">,
  | "condition"
  | "created_at"
  | "deleted_at"
  | "id"
  | "listing_type"
  | "price"
  | "primary_image_url"
  | "seller_id"
  | "status"
  | "title"
  | "updated_at"
> & {
  seller: AdminUserBase | null;
};

export type AdminReportRecord = Pick<
  TableRow<"reports">,
  | "created_at"
  | "description"
  | "id"
  | "reason"
  | "report_type"
  | "reviewed_at"
  | "status"
> & {
  reportedConversation: Pick<TableRow<"conversations">, "id" | "listing_id"> | null;
  reportedListing: Pick<TableRow<"listings">, "deleted_at" | "id" | "status" | "title"> | null;
  reportedMessage: Pick<TableRow<"messages">, "content" | "id"> | null;
  reportedUser: Pick<TableRow<"profiles">, "email" | "first_name" | "id" | "last_name" | "username"> | null;
  reporter: Pick<TableRow<"profiles">, "email" | "first_name" | "id" | "last_name" | "username"> | null;
  reviewedBy: Pick<TableRow<"profiles">, "first_name" | "id" | "last_name" | "username"> | null;
};

export type AdminSupportTicketRecord = Pick<
  TableRow<"support_tickets">,
  | "category"
  | "created_at"
  | "id"
  | "message"
  | "resolved_at"
  | "status"
  | "subject"
> & {
  assignedAdmin: Pick<TableRow<"profiles">, "first_name" | "id" | "last_name" | "username"> | null;
  user: Pick<TableRow<"profiles">, "email" | "first_name" | "id" | "last_name" | "username"> | null;
};

export type AdminAuditRecord = Pick<
  TableRow<"admin_action_logs">,
  | "action_type"
  | "created_at"
  | "id"
  | "notes"
  | "target_id"
  | "target_type"
> & {
  admin: Pick<TableRow<"profiles">, "first_name" | "id" | "last_name" | "username"> | null;
};

export type AdminOverviewStats = {
  activeAdmins: number;
  hiddenListings: number;
  openSupportTickets: number;
  pendingReports: number;
  suspendedUsers: number;
  unverifiedUsers: number;
};

export type AdminWorkspaceData = {
  auditLogs: AdminAuditRecord[];
  listings: AdminListingRecord[];
  overview: AdminOverviewStats;
  reports: AdminReportRecord[];
  supportTickets: AdminSupportTicketRecord[];
  users: AdminUserRecord[];
};

const VIEWER_PROFILE_SELECT =
  "account_status, avatar_url, bio, email, first_name, id, is_verified, last_name, role, suspended_at, university, university_id, username";
const ADMIN_USER_SELECT =
  "account_status, avatar_url, bio, email, first_name, id, is_verified, last_name, role, suspended_at, university, university_id, updated_at, username";
const ADMIN_LISTING_SELECT = `
  id,
  condition,
  created_at,
  deleted_at,
  listing_type,
  price,
  primary_image_url,
  seller_id,
  status,
  title,
  updated_at,
  seller:profiles!listings_seller_id_fkey(${ADMIN_USER_SELECT})
`;
const ADMIN_REPORT_SELECT = `
  id,
  created_at,
  description,
  reason,
  report_type,
  reviewed_at,
  status,
  reportedConversation:conversations!reports_reported_conversation_id_fkey(id, listing_id),
  reportedListing:listings!reports_reported_listing_id_fkey(id, deleted_at, status, title),
  reportedMessage:messages!reports_reported_message_id_fkey(id, content),
  reportedUser:profiles!reports_reported_user_id_fkey(id, email, first_name, last_name, username),
  reporter:profiles!reports_reporter_id_fkey(id, email, first_name, last_name, username),
  reviewedBy:profiles!reports_reviewed_by_fkey(id, first_name, last_name, username)
`;
const ADMIN_SUPPORT_TICKET_SELECT = `
  id,
  category,
  created_at,
  message,
  resolved_at,
  status,
  subject,
  assignedAdmin:profiles!support_tickets_assigned_admin_id_fkey(id, first_name, last_name, username),
  user:profiles!support_tickets_user_id_fkey(id, email, first_name, last_name, username)
`;
const ADMIN_AUDIT_LOG_SELECT = `
  id,
  action_type,
  created_at,
  notes,
  target_id,
  target_type,
  admin:profiles!admin_action_logs_admin_id_fkey(id, first_name, last_name, username)
`;

export function isMarketplaceSuspended(
  profile: Pick<TableRow<"profiles">, "account_status"> | null | undefined,
) {
  return profile?.account_status === "suspended";
}

export function getMarketplaceSuspensionMessage(action: string) {
  return `Your account is suspended and cannot ${action}.`;
}

export function getMarketplaceSuspendedResponse(action: string) {
  return NextResponse.json(
    {
      error: getMarketplaceSuspensionMessage(action),
      status: "error" as const,
    },
    { status: 403 },
  );
}

export async function getViewerAccessContext(): Promise<ViewerAccessContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAdmin: false,
      isSuspended: false,
      profile: null,
      profileId: null,
      supabase,
      userId: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(VIEWER_PROFILE_SELECT)
    .eq("id", user.id)
    .maybeSingle();

  const isSuspended = isMarketplaceSuspended(profile);
  const isAdmin = profile?.role === "admin" && !isSuspended;

  return {
    isAdmin,
    isSuspended,
    profile: profile ?? null,
    profileId: profile?.id ?? null,
    supabase,
    userId: user.id,
  };
}

export async function getAdminContext(): Promise<ViewerAccessContext> {
  return getViewerAccessContext();
}

export async function countActiveAdmins(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("account_status", "active");

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function logAdminAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  action: AdminActionLogInput,
) {
  const { error } = await supabase.from("admin_action_logs").insert({
    action_type: action.actionType,
    admin_id: action.adminId,
    notes: action.notes?.trim() || null,
    target_id: action.targetId,
    target_type: action.targetType,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function requireModerationNote(
  notes: string | null | undefined,
  actionLabel: string,
) {
  if (!notes?.trim()) {
    throw new Error(`A moderation note is required to ${actionLabel}.`);
  }
}

export async function getAdminWorkspaceData(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdminWorkspaceData> {
  const [
    { data: users, error: usersError },
    { data: listings, error: listingsError },
    { data: reports, error: reportsError },
    { data: supportTickets, error: supportTicketsError },
    { data: auditLogs, error: auditLogsError },
    { count: suspendedUsersCount, error: suspendedUsersError },
    { count: unverifiedUsersCount, error: unverifiedUsersError },
    { count: pendingReportsCount, error: pendingReportsError },
    { count: openSupportTicketsCount, error: openSupportTicketsError },
    { count: hiddenListingsCount, error: hiddenListingsError },
    { count: activeAdminsCount, error: activeAdminsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(ADMIN_USER_SELECT)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("listings")
      .select(ADMIN_LISTING_SELECT)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("reports")
      .select(ADMIN_REPORT_SELECT)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("support_tickets")
      .select(ADMIN_SUPPORT_TICKET_SELECT)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("admin_action_logs")
      .select(ADMIN_AUDIT_LOG_SELECT)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("account_status", "suspended"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", false),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .not("deleted_at", "is", null),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("account_status", "active"),
  ]);

  const firstError = [
    usersError,
    listingsError,
    reportsError,
    supportTicketsError,
    auditLogsError,
    suspendedUsersError,
    unverifiedUsersError,
    pendingReportsError,
    openSupportTicketsError,
    hiddenListingsError,
    activeAdminsError,
  ].find(Boolean);

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    auditLogs: (auditLogs ?? []) as unknown as AdminAuditRecord[],
    listings: (listings ?? []) as unknown as AdminListingRecord[],
    overview: {
      activeAdmins: activeAdminsCount ?? 0,
      hiddenListings: hiddenListingsCount ?? 0,
      openSupportTickets: openSupportTicketsCount ?? 0,
      pendingReports: pendingReportsCount ?? 0,
      suspendedUsers: suspendedUsersCount ?? 0,
      unverifiedUsers: unverifiedUsersCount ?? 0,
    },
    reports: (reports ?? []) as unknown as AdminReportRecord[],
    supportTickets: (supportTickets ?? []) as unknown as AdminSupportTicketRecord[],
    users: (users ?? []) as unknown as AdminUserRecord[],
  };
}
