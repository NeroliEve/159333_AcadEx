import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetMarketplaceSuspendedResponse = vi.fn();
const mockGetViewerAccessContext = vi.fn();

vi.mock("@/lib/admin", () => ({
  getMarketplaceSuspendedResponse: mockGetMarketplaceSuspendedResponse,
  getViewerAccessContext: mockGetViewerAccessContext,
}));

vi.mock("@/lib/marketplace", () => ({
  getListingById: vi.fn(),
  getListingRequestState: vi.fn(),
  getMyAvailableListings: vi.fn(),
}));

class MockQuery {
  private filters = new Map<string, unknown>();
  private updatePayload: Record<string, unknown> | null = null;

  constructor(private readonly supabase: ReturnType<typeof createMockSupabase>) {}

  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  maybeSingle() {
    const id = String(this.filters.get("id"));
    return Promise.resolve({
      data: this.supabase.listings[id] ?? null,
      error: null,
    });
  }

  select() {
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.updatePayload = payload;
    this.supabase.updates.push(payload);
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const id = String(this.filters.get("id"));
    if (this.updatePayload && this.supabase.listings[id]) {
      Object.assign(this.supabase.listings[id], this.updatePayload);
    }

    return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
  }
}

function createMockSupabase() {
  return {
    listings: {
      "listing-1": {
        deleted_at: null as string | null,
        seller_id: "seller-1",
      },
    },
    updates: [] as Array<Record<string, unknown>>,
    from(table: string) {
      if (table !== "listings") {
        throw new Error(`Unexpected table ${table}`);
      }

      return new MockQuery(this);
    },
  };
}

describe("DELETE /api/listings/[id]", () => {
  beforeEach(() => {
    mockGetMarketplaceSuspendedResponse.mockReset();
    mockGetViewerAccessContext.mockReset();
    vi.resetModules();
  });

  it("soft deletes the listing instead of hard deleting it so reports keep their target", async () => {
    const supabase = createMockSupabase();
    mockGetViewerAccessContext.mockResolvedValue({
      profile: { account_status: "active", role: "admin" },
      supabase,
      userId: "admin-1",
    });

    const { DELETE } = await import("@/app/api/listings/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/listings/listing-1"), {
      params: Promise.resolve({ id: "listing-1" }),
    });
    const payload = await response.json() as { message: string; status: string };

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      message: "Listing removed from the marketplace.",
      status: "success",
    });
    expect(supabase.updates).toHaveLength(1);
    expect(supabase.updates[0]).toEqual({
      deleted_at: expect.any(String),
    });
    expect(supabase.listings["listing-1"].deleted_at).toEqual(expect.any(String));
  });
});
