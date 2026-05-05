import { NextResponse } from "next/server";

import {
  getMarketplaceSuspendedResponse,
  getViewerAccessContext,
} from "@/lib/admin";

export async function POST(request: Request) {
  const { profile, supabase, userId } = await getViewerAccessContext();

  if (!userId) {
    return NextResponse.json({ error: "You must be logged in to leave a review." }, { status: 401 });
  }

  if (profile?.account_status === "suspended") {
    return getMarketplaceSuspendedResponse("leave reviews");
  }

  const { transactionId, revieweeId, reviewerRole, rating, comment } = await request.json();

  if (!transactionId || !revieweeId || !reviewerRole) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  if (reviewerRole !== "buyer" && reviewerRole !== "seller") {
    return NextResponse.json({ error: "Invalid reviewer role." }, { status: 400 });
  }
  if (userId === revieweeId) {
    return NextResponse.json({ error: "You can't review yourself." }, { status: 400 });
  }

  // Verify the transaction exists, is completed, and the reviewer is a participant
  const { data: transaction } = await supabase
    .from("transactions")
    .select("id, buyer_id, seller_id, status")
    .eq("id", transactionId)
    .maybeSingle();

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }
  if (transaction.status !== "completed") {
    return NextResponse.json({ error: "You can only review a completed transaction." }, { status: 400 });
  }
  if (userId !== transaction.buyer_id && userId !== transaction.seller_id) {
    return NextResponse.json({ error: "You are not part of this transaction." }, { status: 403 });
  }

  // Upsert so editing a review works without hitting the unique constraint
  const { error } = await supabase
    .from("reviews")
    .upsert(
      {
        transaction_id: transactionId,
        reviewer_id: userId,
        reviewee_id: revieweeId,
        reviewer_role: reviewerRole,
        rating,
        comment: comment ?? null,
      },
      { onConflict: "transaction_id,reviewer_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
