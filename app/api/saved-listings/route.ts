import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";

export async function POST(request: Request) {
  const { profile, supabase, userId } = await getViewerAccessContext();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("save listings");
  }

  const { listingId } = await request.json();
  if (!listingId) return NextResponse.json({ error: "Missing listingId." }, { status: 400 });

  const { error } = await supabase
    .from("saved_listings")
    .insert({ user_id: userId, listing_id: listingId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const { profile, supabase, userId } = await getViewerAccessContext();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("save listings");
  }

  const { listingId } = await request.json();
  if (!listingId) return NextResponse.json({ error: "Missing listingId." }, { status: 400 });

  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("user_id", userId)
    .eq("listing_id", listingId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: false });
}
