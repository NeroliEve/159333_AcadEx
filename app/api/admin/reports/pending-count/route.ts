import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin";

export async function GET() {
  const { profile, supabase } = await getAdminContext();

  if (!profile || profile.role !== "admin" || profile.account_status !== "active") {
    return NextResponse.json({ count: 0 }, { status: 403 });
  }

  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return NextResponse.json({ count: count ?? 0 });
}
