import { NextResponse } from "next/server";

import { getViewerAccessContext } from "@/lib/admin";

export async function POST() {
  const { supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ transactions_seen_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
