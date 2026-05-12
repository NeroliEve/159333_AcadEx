import { NextResponse } from "next/server";

import { getAdminContext } from "@/lib/admin";

export async function GET() {
  try {
    const { profile, supabase } = await getAdminContext();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpc = (fn: string) => (supabase as any).rpc(fn) as Promise<{ data: any; error: any }>;

    const [
      { data: summary,       error: e1 },
      { data: byMonth,       error: e2 },
      { data: byStudyArea,   error: e3 },
      { data: byListingType, error: e4 },
      { data: topBooks,      error: e5 },
      { data: byYearLevel,   error: e6 },
    ] = await Promise.all([
      rpc("exchange_summary_stats"),
      rpc("exchanges_by_month"),
      rpc("exchanges_by_study_area"),
      rpc("exchanges_by_listing_type"),
      rpc("top_exchanged_books"),
      rpc("exchanges_by_year_level"),
    ]);

    const firstError = e1 ?? e2 ?? e3 ?? e4 ?? e5 ?? e6;
    if (firstError) {
      return NextResponse.json({ message: firstError.message }, { status: 500 });
    }

    return NextResponse.json({
      summary:       summary?.[0]   ?? null,
      byMonth:       byMonth        ?? [],
      byStudyArea:   byStudyArea    ?? [],
      byListingType: byListingType  ?? [],
      topBooks:      topBooks       ?? [],
      byYearLevel:   byYearLevel    ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to load statistics." },
      { status: 500 },
    );
  }
}
