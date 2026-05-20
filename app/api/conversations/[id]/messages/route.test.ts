import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetViewerAccessContext = vi.fn();
const mockIsBlockedBetween = vi.fn();

vi.mock("@/lib/admin", () => ({
  getMarketplaceSuspendedResponse: vi.fn(),
  getViewerAccessContext: mockGetViewerAccessContext,
}));

vi.mock("@/lib/blocks", () => ({
  isBlockedBetween: mockIsBlockedBetween,
}));

class MockQuery {
  private filters = new Map<string, unknown>();
  private insertPayload: unknown;
  private updatePayload: unknown;

  constructor(private readonly table: string, private readonly supabase: ReturnType<typeof createMockSupabase>) {}

  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  insert(payload: unknown) {
    this.insertPayload = payload;
    this.supabase.inserts.push({ payload, table: this.table });
    return this;
  }

  limit() {
    return this;
  }

  maybeSingle() {
    if (this.table === "conversations") {
      return Promise.resolve({
        data: {
          archived_at: null,
          buyer_id: "viewer",
          id: "conversation-1",
          seller_id: "seller",
        },
        error: null,
      });
    }

    if (this.table === "transactions") {
      return Promise.resolve({
        data: {
          id: "transaction-1",
          request_type: "buy",
          reservation_confirmed_at: "2026-05-01T00:00:00.000Z",
          status: "pending",
        },
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }

  order() {
    return this;
  }

  or() {
    return this;
  }

  select() {
    return this;
  }

  single() {
    if (this.table === "messages" && this.insertPayload) {
      return Promise.resolve({
        data: {
          content: "Hello",
          conversation_id: "conversation-1",
          created_at: "2026-05-02T00:00:00.000Z",
          id: "message-1",
          is_read: false,
          sender: null,
          sender_id: "viewer",
        },
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }

  update(payload: unknown) {
    this.updatePayload = payload;
    this.supabase.updates.push({ payload, table: this.table });
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({
      data: this.updatePayload ? null : [],
      error: null,
    }).then(onfulfilled, onrejected);
  }
}

function createMockSupabase() {
  return {
    inserts: [] as Array<{ payload: unknown; table: string }>,
    updates: [] as Array<{ payload: unknown; table: string }>,
    from(table: string) {
      return new MockQuery(table, this);
    },
  };
}

function postMessage(content = "Hello") {
  return new Request("http://localhost/api/conversations/conversation-1/messages", {
    body: JSON.stringify({ content }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/conversations/[id]/messages", () => {
  beforeEach(() => {
    mockGetViewerAccessContext.mockReset();
    mockIsBlockedBetween.mockReset();
    vi.resetModules();
  });

  it("rejects messages when the recipient has blocked the sender", async () => {
    const supabase = createMockSupabase();
    mockGetViewerAccessContext.mockResolvedValue({
      profile: { account_status: "active" },
      supabase,
      userId: "viewer",
    });
    mockIsBlockedBetween.mockResolvedValue(true);

    const { POST } = await import("@/app/api/conversations/[id]/messages/route");
    const response = await POST(postMessage(), {
      params: Promise.resolve({ id: "conversation-1" }),
    });

    expect(response.status).toBe(403);
    expect(supabase.inserts).toEqual([]);
  });
});
