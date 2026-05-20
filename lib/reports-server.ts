import { createClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/database.types";
export { isBlockedBetween } from "@/lib/blocks";

export type MyReportRow = Pick<
  TableRow<"reports">,
  | "id"
  | "report_type"
  | "reason"
  | "description"
  | "status"
  | "created_at"
  | "reviewed_at"
  | "resolution_note"
  | "reported_listing_id"
  | "reported_user_id"
  | "reported_message_id"
  | "reported_conversation_id"
> & {
  reportedListing: Pick<TableRow<"listings">, "id" | "title"> | null;
  reportedUser: Pick<TableRow<"profiles">, "id" | "username" | "first_name" | "last_name"> | null;
};

export async function getMyReports(userId: string): Promise<MyReportRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select(
      `id, report_type, reason, description, status, created_at, reviewed_at, resolution_note,
       reported_listing_id, reported_user_id, reported_message_id, reported_conversation_id,
       reportedListing:listings!reports_reported_listing_id_fkey(id, title),
       reportedUser:profiles!reports_reported_user_id_fkey(id, username, first_name, last_name)`,
    )
    .eq("reporter_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as MyReportRow[];
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_id")
    .eq("blocker_id", userId);

  return (data ?? []).map((row) => row.blocked_id);
}

export async function getBlockedUsers(userId: string): Promise<
  Array<{
    blocked_id: string;
    created_at: string;
    profile: Pick<TableRow<"profiles">, "id" | "username" | "first_name" | "last_name" | "avatar_url"> | null;
  }>
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_blocks")
    .select(
      `blocked_id, created_at,
       profile:profiles!user_blocks_blocked_id_fkey(id, username, first_name, last_name, avatar_url)`,
    )
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });

  return (data ?? []) as unknown as Array<{
    blocked_id: string;
    created_at: string;
    profile: Pick<TableRow<"profiles">, "id" | "username" | "first_name" | "last_name" | "avatar_url"> | null;
  }>;
}

