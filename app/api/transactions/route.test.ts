import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetViewerAccessContext = vi.fn();

vi.mock("@/lib/admin", () => ({
  getMarketplaceSuspendedResponse: vi.fn(),
  getViewerAccessContext: mockGetViewerAccessContext,
}));

type ListingRow = {
  archived_at: string | null;
  deleted_at?: string | null;
  id: string;
  listing_type: "sale_only" | "trade_only" | "sale_or_trade";
  price: number | null;
  seller_id: string;
  status: "available" | "pending" | "sold" | "archived";
  wanted_trade_text: string | null;
};

type MockSupabaseOptions = {
  declinedBuyCount?: number;
  existingConversation?: { id: string } | null;
  existingTransaction?: { id: string } | null;
  listings: Record<string, ListingRow>;
};

class MockQuery {
  private filters = new Map<string, unknown>();
  private insertPayload: unknown;
  private selectOptions: { count?: "exact"; head?: boolean } | undefined;
  private updatePayload: unknown;

  constructor(
    private readonly table: string,
    private readonly supabase: ReturnType<typeof createMockSupabase>,
  ) {}

  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  insert(payload: unknown) {
    this.insertPayload = payload;
    this.supabase.inserts.push({ payload, table: this.table });
    return this;
  }

  maybeSingle() {
    if (this.table === "listings") {
      const id = String(this.filters.get("id"));
      return Promise.resolve({ data: this.supabase.options.listings[id] ?? null, error: null });
    }

    if (this.table === "transactions") {
      return Promise.resolve({
        data: this.supabase.options.existingTransaction ?? null,
        error: null,
      });
    }

    if (this.table === "conversations") {
      return Promise.resolve({
        data: this.supabase.options.existingConversation ?? null,
        error: null,
      });
    }

    return Promise.resolve({ data: null, error: null });
  }

  select(_columns: string, options?: { count?: "exact"; head?: boolean }) {
    this.selectOptions = options;
    return this;
  }

  single() {
    if (this.table === "conversations" && this.insertPayload) {
      return Promise.resolve({ data: { id: "conversation-new" }, error: null });
    }

    if (this.table === "transactions" && this.insertPayload) {
      return Promise.resolve({ data: { id: "transaction-new" }, error: null });
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
    if (this.table === "transactions" && this.selectOptions?.head) {
      return Promise.resolve({
        count: this.supabase.options.declinedBuyCount ?? 0,
        data: null,
        error: null,
      }).then(onfulfilled, onrejected);
    }

    return Promise.resolve({
      data: this.updatePayload ? null : [],
      error: null,
    }).then(onfulfilled, onrejected);
  }
}

function createMockSupabase(options: MockSupabaseOptions) {
  return {
    inserts: [] as Array<{ payload: unknown; table: string }>,
    options,
    updates: [] as Array<{ payload: unknown; table: string }>,
    from(table: string) {
      return new MockQuery(table, this);
    },
  };
}

function postTransaction(body: Record<string, unknown>) {
  return new Request("http://localhost/api/transactions", {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/transactions", () => {
  const tradeListing: ListingRow = {
    archived_at: null,
    id: "listing-trade",
    listing_type: "trade_only",
    price: null,
    seller_id: "seller-1",
    status: "available",
    wanted_trade_text: "Accounting 101",
  };

  const saleListing: ListingRow = {
    archived_at: null,
    id: "listing-sale",
    listing_type: "sale_only",
    price: 40,
    seller_id: "seller-1",
    status: "available",
    wanted_trade_text: null,
  };

  beforeEach(() => {
    mockGetViewerAccessContext.mockReset();
  });

  it("creates a message-only trade request for a trade-only listing", async () => {
    const supabase = createMockSupabase({
      existingConversation: null,
      listings: { "listing-trade": tradeListing },
    });
    mockGetViewerAccessContext.mockResolvedValue({
      profile: { account_status: "active" },
      supabase,
      userId: "buyer-1",
    });

    const { POST } = await import("@/app/api/transactions/route");
    const response = await POST(postTransaction({
      listingId: "listing-trade",
      requestMessage: "Interested in swapping after exams.",
      requestType: "trade",
    }));

    expect(response.status).toBe(200);
    expect(supabase.inserts).toContainEqual({
      table: "transactions",
      payload: expect.objectContaining({
        offered_listing_id: null,
        payment_status: "not_required",
        request_message: "Interested in swapping after exams.",
        request_type: "trade",
      }),
    });
    expect(supabase.inserts).toContainEqual({
      table: "messages",
      payload: expect.objectContaining({
        content: "Interested in swapping after exams.",
      }),
    });
  });

  it("rejects trade requests for sale-only listings", async () => {
    const supabase = createMockSupabase({
      listings: { "listing-sale": saleListing },
    });
    mockGetViewerAccessContext.mockResolvedValue({
      profile: { account_status: "active" },
      supabase,
      userId: "buyer-1",
    });

    const { POST } = await import("@/app/api/transactions/route");
    const response = await POST(postTransaction({
      listingId: "listing-sale",
      requestMessage: "Can we swap?",
      requestType: "trade",
    }));

    expect(response.status).toBe(400);
    expect(supabase.inserts).toEqual([]);
  });

  it("rejects an attached offered listing owned by someone else", async () => {
    const supabase = createMockSupabase({
      listings: {
        "listing-trade": tradeListing,
        "offered-listing": {
          ...saleListing,
          id: "offered-listing",
          seller_id: "someone-else",
        },
      },
    });
    mockGetViewerAccessContext.mockResolvedValue({
      profile: { account_status: "active" },
      supabase,
      userId: "buyer-1",
    });

    const { POST } = await import("@/app/api/transactions/route");
    const response = await POST(postTransaction({
      listingId: "listing-trade",
      offeredListingId: "offered-listing",
      requestMessage: "I can swap my spare book.",
      requestType: "trade",
    }));

    expect(response.status).toBe(403);
    expect(supabase.inserts).toEqual([]);
  });

  it("rejects duplicate pending requests from the same buyer", async () => {
    const supabase = createMockSupabase({
      existingTransaction: { id: "transaction-existing" },
      listings: { "listing-trade": tradeListing },
    });
    mockGetViewerAccessContext.mockResolvedValue({
      profile: { account_status: "active" },
      supabase,
      userId: "buyer-1",
    });

    const { POST } = await import("@/app/api/transactions/route");
    const response = await POST(postTransaction({
      listingId: "listing-trade",
      requestMessage: "Can we discuss a swap?",
      requestType: "trade",
    }));

    expect(response.status).toBe(409);
    expect(supabase.inserts).toEqual([]);
  });
});
