import { NextResponse } from "next/server";

import { getViewerAccessContext } from "@/lib/admin";
import { canReviewTransactionStatus } from "@/lib/exchange-flow";

export async function GET() {
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }
  if (profile?.account_status === "suspended") {
    return NextResponse.json({ count: 0 });
  }

  const seenAt = profile?.transactions_seen_at ?? "1970-01-01T00:00:00Z";

  // Count transactions involving the viewer where the last update happened
  // after the viewer last opened their transactions list.
  const { data } = await supabase
    .from("transactions")
    .select("id, status, reservation_confirmed_at")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .gt("updated_at", seenAt);

  const count = (data ?? []).filter((tx) =>
    canReviewTransactionStatus(tx.status, tx.reservation_confirmed_at),
  ).length;

  return NextResponse.json({ count });
}
