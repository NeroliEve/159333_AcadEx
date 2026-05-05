import { createClient } from "@/lib/supabase/server";
import type { TableRow } from "@/lib/supabase/database.types";
import { hasEnvVars } from "@/lib/utils";
export { MAX_MESSAGE_LENGTH } from "@/lib/message-constants";

type ConversationParticipant = Pick<
  TableRow<"profiles">,
  | "avatar_url"
  | "email"
  | "first_name"
  | "id"
  | "is_verified"
  | "last_name"
  | "university"
  | "username"
>;

type ConversationListing = Pick<
  TableRow<"listings">,
  "id" | "primary_image_url" | "status" | "title"
>;

export type ConversationMessage = TableRow<"messages"> & {
  sender: ConversationParticipant | null;
};

type ConversationRow = Pick<
  TableRow<"conversations">,
  "buyer_id" | "created_at" | "id" | "last_message_at" | "listing_id" | "seller_id"
> & {
  buyer: ConversationParticipant | null;
  listing: ConversationListing | null;
  seller: ConversationParticipant | null;
};

export type ConversationSummary = ConversationRow & {
  latestMessage: ConversationMessage | null;
  otherParticipant: ConversationParticipant | null;
  unreadCount: number;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
};

const CONVERSATION_PARTICIPANT_SELECT = `
  id,
  avatar_url,
  email,
  first_name,
  is_verified,
  last_name,
  university,
  username
`;

const CONVERSATION_SELECT = `
  id,
  buyer_id,
  seller_id,
  listing_id,
  created_at,
  last_message_at,
  listing:listings!conversations_listing_id_fkey(id, primary_image_url, status, title),
  buyer:profiles!conversations_buyer_id_fkey(${CONVERSATION_PARTICIPANT_SELECT}),
  seller:profiles!conversations_seller_id_fkey(${CONVERSATION_PARTICIPANT_SELECT})
`;

export const MESSAGE_SELECT = `
  id,
  content,
  conversation_id,
  created_at,
  is_read,
  sender_id,
  sender:profiles!messages_sender_id_fkey(${CONVERSATION_PARTICIPANT_SELECT})
`;

function getOtherParticipant(
  conversation: ConversationRow,
  viewerId: string,
): ConversationParticipant | null {
  return conversation.buyer_id === viewerId ? conversation.seller : conversation.buyer;
}

function buildMessageMaps(
  messages: ConversationMessage[],
  viewerId: string,
) {
  const latestByConversation = new Map<string, ConversationMessage>();
  const unreadCounts = new Map<string, number>();

  for (const message of messages) {
    if (!latestByConversation.has(message.conversation_id)) {
      latestByConversation.set(message.conversation_id, message);
    }

    if (!message.is_read && message.sender_id !== viewerId) {
      unreadCounts.set(
        message.conversation_id,
        (unreadCounts.get(message.conversation_id) ?? 0) + 1,
      );
    }
  }

  return { latestByConversation, unreadCounts };
}

function toConversationSummary(
  conversation: ConversationRow,
  viewerId: string,
  latestByConversation: Map<string, ConversationMessage>,
  unreadCounts: Map<string, number>,
): ConversationSummary {
  return {
    ...conversation,
    latestMessage: latestByConversation.get(conversation.id) ?? null,
    otherParticipant: getOtherParticipant(conversation, viewerId),
    unreadCount: unreadCounts.get(conversation.id) ?? 0,
  };
}

function sortConversations<T extends ConversationRow>(conversations: T[]) {
  return [...conversations].sort((left, right) => {
    const leftTimestamp = Date.parse(left.last_message_at ?? left.created_at);
    const rightTimestamp = Date.parse(right.last_message_at ?? right.created_at);

    return rightTimestamp - leftTimestamp;
  });
}

export async function getMyConversationSummaries(
  viewerId: string,
): Promise<ConversationSummary[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .or(`buyer_id.eq.${viewerId},seller_id.eq.${viewerId}`);

  if (error || !data || data.length === 0) return [];

  const conversationRows = sortConversations(data as unknown as ConversationRow[]);
  const conversationIds = conversationRows.map((conversation) => conversation.id);
  const { data: messageData } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const messages = (messageData ?? []) as unknown as ConversationMessage[];
  const { latestByConversation, unreadCounts } = buildMessageMaps(messages, viewerId);

  return conversationRows.map((conversation) =>
    toConversationSummary(conversation, viewerId, latestByConversation, unreadCounts),
  );
}

export async function getUnreadMessageCount(
  viewerId: string,
): Promise<number> {
  if (!hasEnvVars) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .or(`buyer_id.eq.${viewerId},seller_id.eq.${viewerId}`);

  if (error || !data || data.length === 0) return 0;

  const conversationIds = data.map((conversation) => conversation.id);
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .eq("is_read", false)
    .neq("sender_id", viewerId);

  return count ?? 0;
}

export async function getConversationDetail(
  conversationId: string,
  viewerId: string,
): Promise<{
  conversation: ConversationDetail | null;
  error: string | null;
}> {
  if (!hasEnvVars) {
    return { conversation: null, error: "Supabase environment variables are missing." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", conversationId)
    .maybeSingle();

  if (error) return { conversation: null, error: error.message };
  if (!data) return { conversation: null, error: null };

  const { data: messageData, error: messageError } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (messageError) return { conversation: null, error: messageError.message };

  const messages = (messageData ?? []) as unknown as ConversationMessage[];
  const reversedMessages = [...messages].reverse();
  const { latestByConversation, unreadCounts } = buildMessageMaps(
    reversedMessages,
    viewerId,
  );

  const summary = toConversationSummary(
    data as unknown as ConversationRow,
    viewerId,
    latestByConversation,
    unreadCounts,
  );

  return {
    conversation: {
      ...summary,
      messages,
    },
    error: null,
  };
}
