import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/utils", () => ({
  hasEnvVars: true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

class MockQuery {
  constructor(private readonly result: unknown) {}

  eq() {
    return this;
  }

  gte() {
    return this;
  }

  in() {
    return this;
  }

  is() {
    return this;
  }

  limit() {
    return this;
  }

  lte() {
    return this;
  }

  not() {
    return this;
  }

  or() {
    return this;
  }

  order() {
    return this;
  }

  select() {
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

describe("getListingsFeed", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockCreateClient.mockReset();
  });

  it("uses the supplied viewer id instead of refetching the auth user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "viewer-1" } },
      error: null,
    });

    const supabase = {
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === "user_blocks") {
          return new MockQuery({ data: [], error: null });
        }

        if (table === "listings") {
          return new MockQuery({ data: [], error: null });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    mockCreateClient.mockResolvedValue(supabase);

    const { getListingsFeed } = await import("@/lib/marketplace");

    await getListingsFeed("authenticated", {}, 24, { viewerId: "viewer-1" });

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith("user_blocks");
    expect(supabase.from).toHaveBeenCalledWith("listings");
  });
});

describe("browse query helpers", () => {
  it("parses browse filters from URL search params", async () => {
    const { getListingsFeedFilters } = await import("@/lib/marketplace");

    const filters = getListingsFeedFilters(
      new URLSearchParams({
        condition: "good",
        courseId: "12",
        listingType: "sale",
        maxPrice: "80",
        minPrice: "10",
        q: "biology",
        sellerName: "Alex",
        studyAreaId: "3",
        universityId: "5",
      }),
    );

    expect(filters).toEqual({
      condition: "good",
      courseId: 12,
      listingType: "sale",
      maxPrice: 80,
      minPrice: 10,
      q: "biology",
      sellerName: "Alex",
      studyAreaId: 3,
      universityId: 5,
    });
  });

  it("lets client browse refreshes skip static filter metadata", async () => {
    const { shouldIncludeBrowseMetadata } = await import("@/lib/marketplace");

    expect(shouldIncludeBrowseMetadata(new URLSearchParams())).toBe(true);
    expect(shouldIncludeBrowseMetadata(new URLSearchParams("_metadata=1"))).toBe(true);
    expect(shouldIncludeBrowseMetadata(new URLSearchParams("_metadata=0"))).toBe(false);
  });
});

describe("getListingRequestState", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockCreateClient.mockReset();
    vi.resetModules();
  });

  it("does not treat cancelled transactions as pending request state", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "transactions") {
          return new MockQuery({
            data: [
              {
                conversation_id: "conversation-cancelled",
                offered_listing_id: null,
                request_type: "buy",
                status: "cancelled",
              },
              {
                conversation_id: "conversation-declined",
                offered_listing_id: null,
                request_type: "buy",
                status: "declined",
              },
            ],
            error: null,
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    mockCreateClient.mockResolvedValue(supabase);

    const { getListingRequestState } = await import("@/lib/marketplace");

    const state = await getListingRequestState("listing-1", "buyer-1");

    expect(state.pendingTransaction).toBeNull();
    expect(state.canRequestToBuy).toBe(true);
    expect(state.buyStatusMessage).toBe("Buy request declined. You can request 2 more times.");
    expect(state.conversationId).toBe("conversation-declined");
  });
});

describe("shouldShowListingRequestActions", () => {
  it("keeps request actions visible for the buyer's pending transaction after seller acceptance marks the listing pending", async () => {
    const { shouldShowListingRequestActions } = await import("@/lib/marketplace");

    expect(shouldShowListingRequestActions({
      hasViewerPendingTransaction: true,
      listingStatus: "pending",
    })).toBe(true);
  });
});
