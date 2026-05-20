import { createAdminClient } from "@/lib/supabase/admin";

type BlockRow = {
  blocker_id: string;
  blocked_id: string;
};

export type BlockRelationship = {
  blockedByMe: boolean;
  blockedMe: boolean;
};

function assertDistinctUsers(leftId: string | null | undefined, rightId: string | null | undefined) {
  return !!leftId && !!rightId && leftId !== rightId;
}

export async function isBlockedBetween(
  leftId: string | null | undefined,
  rightId: string | null | undefined,
): Promise<boolean> {
  if (!assertDistinctUsers(leftId, rightId)) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${leftId},blocked_id.eq.${rightId}),and(blocker_id.eq.${rightId},blocked_id.eq.${leftId})`,
    )
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).length > 0;
}

export async function getBlockRelationship(
  viewerId: string | null | undefined,
  targetId: string | null | undefined,
): Promise<BlockRelationship> {
  if (!assertDistinctUsers(viewerId, targetId)) {
    return { blockedByMe: false, blockedMe: false };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${viewerId},blocked_id.eq.${targetId}),and(blocker_id.eq.${targetId},blocked_id.eq.${viewerId})`,
    );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as BlockRow[];
  return {
    blockedByMe: rows.some((row) => row.blocker_id === viewerId && row.blocked_id === targetId),
    blockedMe: rows.some((row) => row.blocker_id === targetId && row.blocked_id === viewerId),
  };
}

export async function getBlockedCounterpartyIds(
  viewerId: string | null | undefined,
): Promise<string[]> {
  if (!viewerId) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);

  if (error) {
    throw new Error(error.message);
  }

  return [
    ...new Set(
      ((data ?? []) as BlockRow[]).map((row) =>
        row.blocker_id === viewerId ? row.blocked_id : row.blocker_id,
      ),
    ),
  ];
}
