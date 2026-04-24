import { NextResponse } from "next/server";

import { MAX_MESSAGE_LENGTH, MESSAGE_SELECT } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

type MessageRouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  context: MessageRouteContext,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "You must be logged in to send messages." },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  const requestBody = await request.json().catch(() => ({}));
  const content = typeof requestBody.content === "string"
    ? requestBody.content.trim()
    : "";

  if (!content) {
    return NextResponse.json(
      { error: "Message content is required." },
      { status: 400 },
    );
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

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

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      content,
      conversation_id: id,
      sender_id: user.id,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !message) {
    return NextResponse.json(
      { error: error?.message ?? "Could not send your message." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message });
}
