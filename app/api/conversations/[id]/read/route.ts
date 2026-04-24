import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type ReadRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: Request,
  context: ReadRouteContext,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to update read status." },
      { status: 401 },
    );
  }

  const { id } = await context.params;
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  const { data: updatedMessages, error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", id)
    .eq("is_read", false)
    .neq("sender_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ updatedCount: updatedMessages?.length ?? 0 });
}
