import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetViewerAccessContext = vi.fn();
const mockIsBlockedBetween = vi.fn();
const mockCreateAdminClient = vi.fn();

vi.mock("@/lib/admin", () => ({
  getMarketplaceSuspendedResponse: vi.fn(),
  getViewerAccessContext: mockGetViewerAccessContext,
}));

vi.mock("@/lib/blocks", () => ({
  isBlockedBetween: mockIsBlockedBetween,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

type ListingRow = {
  archived_at: string | null;
  id: string;
  seller_id: string;
  status: "available" | "pending" | "sold" | "archived";
};

type TransactionRow = {
  buyer_id: string;
  conversation_id: string | null;
  id: string;
  listing_id: string;
  offered_listing_id: string | null;
  payment_status: "not_required" | "unpaid" | "checkout_pending" | "paid" | "paid_in_person" | "failed";
  request_type: "buy" | "trade";
  reservation_confirmed_at: string | null;
  seller_id: string;
  status: "pending" | "completed" | "cancelled" | "declined" | "mismatch";
};

type ConversationRow = {
  close_after?: string | null;
  id: string;
};

type MockDb = {
  conversations: Record<string, ConversationRow>;
  listings: Record<string, ListingRow>;
  transactions: Record<string, TransactionRow>;
};

class MockQuery {
  private filters = new Map<string, unknown>();
  private inFilters = new Map<string, unknown[]>();
  private notEqualFilters = new Map<string, unknown>();
  private updatePayload: Record<string, unknown> | null = null;

  constructor(
    private readonly table: keyof MockDb,
    private readonly supabase: ReturnType<typeof createMockSupabase>,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.inFilters.set(column, values);
    return this;
  }

  neq(column: string, value: unknown) {
    this.notEqualFilters.set(column, value);
    return this;
  }

  maybeSingle() {
    if (this.table === "transactions") {
      const id = String(this.filters.get("id"));
      return Promise.resolve({
        data: this.supabase.db.transactions[id] ?? null,
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }

  select() {
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.updatePayload = payload;
    return this;
  }

  private rowMatches(row: Record<string, unknown>) {
    for (const [column, value] of this.filters) {
      if (row[column] !== value) return false;
    }
    for (const [column, values] of this.inFilters) {
      if (!values.includes(row[column])) return false;
    }
    for (const [column, value] of this.notEqualFilters) {
      if (row[column] === value) return false;
    }
    return true;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    if (this.updatePayload) {
      const rows = Object.values(this.supabase.db[this.table]) as Array<Record<string, unknown>>;
      for (const row of rows) {
        if (!this.rowMatches(row)) continue;
        if (!this.supabase.canUpdate(this.table, row)) continue;
        Object.assign(row, this.updatePayload);
      }
    }

    return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
  }
}

function createMockSupabase(
  db: MockDb,
  options: { admin?: boolean; userId?: string } = {},
) {
  return {
    db,
    canUpdate(table: keyof MockDb, row: Record<string, unknown>) {
      if (options.admin) return true;
      if (table === "listings") return row.seller_id === options.userId;
      if (table === "transactions") {
        return row.buyer_id === options.userId || row.seller_id === options.userId;
      }
      return true;
    },
    from(table: keyof MockDb) {
      return new MockQuery(table, this);
    },
  };
}

function patchTransaction(action: string) {
  return new Request("http://localhost/api/transactions/transaction-1", {
    body: JSON.stringify({ action }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

describe("PATCH /api/transactions/[id]", () => {
  beforeEach(() => {
    mockGetViewerAccessContext.mockReset();
    mockIsBlockedBetween.mockReset();
    mockCreateAdminClient.mockReset();
    mockIsBlockedBetween.mockResolvedValue(false);
    vi.resetModules();
  });

  it("completes an accepted trade and archives both listings even when the offered listing belongs to the requester", async () => {
    const db: MockDb = {
      conversations: {
        "conversation-1": {
          id: "conversation-1",
        },
      },
      listings: {
        "listing-target": {
          archived_at: null,
          id: "listing-target",
          seller_id: "seller-1",
          status: "pending",
        },
        "listing-offered": {
          archived_at: null,
          id: "listing-offered",
          seller_id: "buyer-1",
          status: "pending",
        },
      },
      transactions: {
        "transaction-1": {
          buyer_id: "buyer-1",
          conversation_id: "conversation-1",
          id: "transaction-1",
          listing_id: "listing-target",
          offered_listing_id: "listing-offered",
          payment_status: "not_required",
          request_type: "trade",
          reservation_confirmed_at: "2026-05-20T00:00:00.000Z",
          seller_id: "seller-1",
          status: "pending",
        },
      },
    };
    const viewerSupabase = createMockSupabase(db, { userId: "seller-1" });
    const adminSupabase = createMockSupabase(db, { admin: true });

    mockGetViewerAccessContext.mockResolvedValue({
      profile: { account_status: "active" },
      supabase: viewerSupabase,
      userId: "seller-1",
    });
    mockCreateAdminClient.mockReturnValue(adminSupabase);

    const { PATCH } = await import("@/app/api/transactions/[id]/route");
    const response = await PATCH(patchTransaction("complete"), {
      params: Promise.resolve({ id: "transaction-1" }),
    });

    expect(response.status).toBe(200);
    expect(db.transactions["transaction-1"]).toMatchObject({
      seller_confirmed_completed: true,
      status: "completed",
    });
    expect(db.listings["listing-target"]).toMatchObject({
      archived_at: expect.any(String),
      status: "archived",
    });
    expect(db.listings["listing-offered"]).toMatchObject({
      archived_at: expect.any(String),
      status: "archived",
    });
    expect(db.conversations["conversation-1"].close_after).toEqual(expect.any(String));
  });
});
