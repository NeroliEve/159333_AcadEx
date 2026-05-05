import { NextResponse } from "next/server";

import { getViewerAccessContext } from "@/lib/admin";
import { getUnreadMessageCount } from "@/lib/messages";

export async function GET() {
  const { profile, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ count: 0 }, { status: 401 });
  }

  if (profile?.account_status === "suspended") {
    return NextResponse.json({ count: 0 });
  }

  const count = await getUnreadMessageCount(userId);
  return NextResponse.json({ count });
}
