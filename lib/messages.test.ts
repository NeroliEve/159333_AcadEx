import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateClient = vi.fn();
const mockGetBlockedCounterpartyIds = vi.fn();
const mockIsBlockedBetween = vi.fn();

vi.mock("@/lib/utils", () => ({
  hasEnvVars: true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/blocks", () => ({
  getBlockedCounterpartyIds: mockGetBlockedCounterpartyIds,
  isBlockedBetween: mockIsBlockedBetween,
}));

type QueryCall = {
  method: string;
  table: string;
  value?: unknown;
};

class MockQuery {
  constructor(
    private readonly table: string,
    private readonly result: unknown,
    private readonly calls: QueryCall[],
  ) {}

  eq(_column: string, value: unknown) {
    this.calls.push({ method: "eq", table: this.table, value });
    return this;
  }

  in(_column: string, value: unknown) {
    this.calls.push({ method: "in", table: this.table, value });
    return this;
  }

  is(_column: string, value: unknown) {
    this.calls.push({ method: "is", table: this.table, value });
    return this;
  }

  neq(_column: string, value: unknown) {
    this.calls.push({ method: "neq", table: this.table, value });
    return this;
  }

  not(_column: string, _operator: string, value: unknown) {
    this.calls.push({ method: "not", table: this.table, value });
    return this;
  }

  or(value: string) {
    this.calls.push({ method: "or", table: this.table, value });
    return this;
  }

  order(column: string) {
    this.calls.push({ method: "order", table: this.table, value: column });
    return this;
  }

  select(value: string) {
    this.calls.push({ method: "select", table: this.table, value });
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

describe("getMyConversationSummaries", () => {
  const calls: QueryCall[] = [];

  beforeEach(() => {
    calls.length = 0;
    mockCreateClient.mockReset();
    mockGetBlockedCounterpartyIds.mockReset();
    mockGetBlockedCounterpartyIds.mockResolvedValue([]);
    mockIsBlockedBetween.mockReset();
    mockIsBlockedBetween.mockResolvedValue(false);
    vi.resetModules();
  });

  it("loads sidebar summaries without fetching the full message history", async () => {
    const buyer = {
      avatar_url: null,
      email: "buyer@example.com",
      first_name: "Buyer",
      id: "viewer",
      last_name: "User",
      university: "Massey",
      username: "buyer",
    };
    const seller = {
      avatar_url: null,
      email: "seller@example.com",
      first_name: "Seller",
      id: "seller",
      last_name: "User",
      university: "Massey",
      username: "seller",
    };
    const conversation = {
      archived_at: null,
      buyer,
      buyer_id: "viewer",
      created_at: "2026-05-01T00:00:00.000Z",
      delete_after: null,
      id: "conversation-1",
      last_message_at: "2026-05-02T00:00:00.000Z",
      listing: {
        id: "listing-1",
        primary_image_url: null,
        status: "available",
        title: "Book",
      },
      listing_id: "listing-1",
      seller,
      seller_id: "seller",
    };
    const latestMessage = {
      content: "Latest preview",
      conversation_id: "conversation-1",
      created_at: "2026-05-02T00:00:00.000Z",
      id: "message-2",
      is_read: false,
      sender: seller,
      sender_id: "seller",
    };

    let messagesQueryCount = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "conversations") {
          return new MockQuery(table, { data: [conversation], error: null }, calls);
        }

        if (table === "messages") {
          messagesQueryCount += 1;
          return new MockQuery(
            table,
            messagesQueryCount === 1
              ? { data: [latestMessage], error: null }
              : {
                  data: [
                    { conversation_id: "conversation-1", id: "message-2" },
                    { conversation_id: "conversation-1", id: "message-3" },
                  ],
                  error: null,
                },
            calls,
          );
        }

        if (table === "transactions") {
          return new MockQuery(table, { data: [], error: null }, calls);
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    mockCreateClient.mockResolvedValue(supabase);

    const { getMyConversationSummaries } = await import("@/lib/messages");
    const summaries = await getMyConversationSummaries("viewer");

    const messageSelects = calls
      .filter((call) => call.table === "messages" && call.method === "select")
      .map((call) => String(call.value));

    expect(messagesQueryCount).toBe(2);
    expect(messageSelects[0]).toContain("sender:profiles");
    expect(messageSelects[1]).toBe("id, conversation_id");
    expect(summaries[0].latestMessage?.content).toBe("Latest preview");
    expect(summaries[0].unreadCount).toBe(2);
  });
});
