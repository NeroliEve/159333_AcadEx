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

export type ConversationTransaction = {
  id: string;
  agreed_price: number | null;
  agreed_trade_text: string | null;
  buyer_id: string;
  cancelled_at: string | null;
  completed_at: string | null;
  conversation_id: string | null;
  declined_at: string | null;
  listing_id: string;
  offered_listing_id: string | null;
  paid_at: string | null;
  payment_status: TableRow<"transactions">["payment_status"];
  payment_requested_at: string | null;
  payment_requested_by: string | null;
  reservation_confirmed_at: string | null;
  request_message: string | null;
  seller_id: string;
  status: TableRow<"transactions">["status"];
  offered_listing: ConversationListing | null;
};

export type ConversationMessage = TableRow<"messages"> & {
  sender: ConversationParticipant | null;
};

export type ConversationReview = Pick<
  TableRow<"reviews">,
  "comment" | "rating"
> | null;

type ConversationRow = Pick<
  TableRow<"conversations">,
  | "archived_at"
  | "buyer_id"
  | "created_at"
  | "delete_after"
  | "id"
  | "last_message_at"
  | "listing_id"
  | "seller_id"
> & {
  buyer: ConversationParticipant | null;
  close_after?: string | null;
  listing: ConversationListing | null;
  seller: ConversationParticipant | null;
};

export type ConversationSummary = ConversationRow & {
  latestMessage: ConversationMessage | null;
  otherParticipant: ConversationParticipant | null;
  transaction: ConversationTransaction | null;
  unreadCount: number;
};

export type ConversationDetail = ConversationSummary & {
  messages: ConversationMessage[];
  viewerReview: ConversationReview;
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
  archived_at,
  created_at,
  delete_after,
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

const CONVERSATION_TRANSACTION_SELECT = `
  id,
  agreed_price,
  agreed_trade_text,
  buyer_id,
  cancelled_at,
  completed_at,
  conversation_id,
  declined_at,
  listing_id,
  offered_listing_id,
  paid_at,
  payment_status,
  payment_requested_at,
  payment_requested_by,
  reservation_confirmed_at,
  request_message,
  seller_id,
  status,
  offered_listing:listings!transactions_offered_listing_id_fkey(id, primary_image_url, status, title)
`;

const LEGACY_CONVERSATION_TRANSACTION_SELECT = `
  id,
  agreed_price,
  agreed_trade_text,
  buyer_id,
  cancelled_at,
  completed_at,
  conversation_id,
  declined_at,
  listing_id,
  offered_listing_id,
  paid_at,
  payment_status,
  reservation_confirmed_at,
  request_message,
  seller_id,
  status,
  offered_listing:listings!transactions_offered_listing_id_fkey(id, primary_image_url, status, title)
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
  transactionByConversation: Map<string, ConversationTransaction>,
): ConversationSummary {
  return {
    ...conversation,
    latestMessage: latestByConversation.get(conversation.id) ?? null,
    otherParticipant: getOtherParticipant(conversation, viewerId),
    transaction: transactionByConversation.get(conversation.id) ?? null,
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

async function getLatestTransactionsByConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationIds: string[],
) {
  const transactionByConversation = new Map<string, ConversationTransaction>();

  if (conversationIds.length === 0) return transactionByConversation;

  const result = await supabase
    .from("transactions")
    .select(CONVERSATION_TRANSACTION_SELECT)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });
  let data = result.data as unknown[] | null;
  let error = result.error;

  if (error) {
    const legacyResult = await supabase
      .from("transactions")
      .select(LEGACY_CONVERSATION_TRANSACTION_SELECT)
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    data = legacyResult.data as unknown[] | null;
    error = legacyResult.error;
  }

  if (error) return transactionByConversation;

  const transactions = ((data ?? []) as unknown as ConversationTransaction[]).map(
    (transaction) => ({
      ...transaction,
      payment_requested_at: transaction.payment_requested_at ?? null,
      payment_requested_by: transaction.payment_requested_by ?? null,
    }),
  );

  for (const transaction of transactions) {
    if (transaction.conversation_id && !transactionByConversation.has(transaction.conversation_id)) {
      transactionByConversation.set(transaction.conversation_id, transaction);
    }
  }

  return transactionByConversation;
}

export async function getMyConversationSummaries(
  viewerId: string,
  options: { archived?: boolean } = {},
): Promise<ConversationSummary[]> {
  if (!hasEnvVars) return [];

  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .or(`buyer_id.eq.${viewerId},seller_id.eq.${viewerId}`);

  query = options.archived
    ? query.not("archived_at", "is", null)
    : query.is("archived_at", null);

  const { data, error } = await query;

  if (error || !data || data.length === 0) return [];

  // Hide conversations with anyone the viewer has blocked OR who has blocked the viewer
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);

  const blockedCounterparties = new Set<string>(
    (blocks ?? []).map((row) => (row.blocker_id === viewerId ? row.blocked_id : row.blocker_id)),
  );

  const filteredRows = (data as unknown as ConversationRow[]).filter((conv) => {
    const otherId = conv.buyer_id === viewerId ? conv.seller_id : conv.buyer_id;
    return !blockedCounterparties.has(otherId);
  });

  if (filteredRows.length === 0) return [];

  const conversationRows = sortConversations(filteredRows);
  const conversationIds = conversationRows.map((conversation) => conversation.id);
  const { data: messageData } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  const messages = (messageData ?? []) as unknown as ConversationMessage[];
  const { latestByConversation, unreadCounts } = buildMessageMaps(messages, viewerId);
  const transactionByConversation = await getLatestTransactionsByConversation(
    supabase,
    conversationIds,
  );

  return conversationRows.map((conversation) =>
    toConversationSummary(
      conversation,
      viewerId,
      latestByConversation,
      unreadCounts,
      transactionByConversation,
    ),
  );
}

export async function getUnreadMessageCount(
  viewerId: string,
): Promise<number> {
  if (!hasEnvVars) return 0;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, buyer_id, seller_id")
    .or(`buyer_id.eq.${viewerId},seller_id.eq.${viewerId}`)
    .is("archived_at", null);

  if (error || !data || data.length === 0) return 0;

  // Skip conversations with blocked users (either direction)
  const { data: blocks } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${viewerId},blocked_id.eq.${viewerId}`);

  const blockedCounterparties = new Set<string>(
    (blocks ?? []).map((row) => (row.blocker_id === viewerId ? row.blocked_id : row.blocker_id)),
  );

  const conversationIds = data
    .filter((conv) => {
      const otherId = conv.buyer_id === viewerId ? conv.seller_id : conv.buyer_id;
      return !blockedCounterparties.has(otherId);
    })
    .map((conversation) => conversation.id);

  if (conversationIds.length === 0) return 0;

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
    await getLatestTransactionsByConversation(supabase, [conversationId]),
  );

  return {
    conversation: {
      ...summary,
      messages,
      viewerReview: summary.transaction
        ? await getReviewForConversationTransaction(supabase, summary.transaction.id, viewerId)
        : null,
    },
    error: null,
  };
}

async function getReviewForConversationTransaction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  transactionId: string,
  reviewerId: string,
): Promise<ConversationReview> {
  const { data } = await supabase
    .from("reviews")
    .select("rating, comment")
    .eq("transaction_id", transactionId)
    .eq("reviewer_id", reviewerId)
    .maybeSingle();

  return data ?? null;
}
