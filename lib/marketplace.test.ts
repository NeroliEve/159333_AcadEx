import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockCreateClient = vi.fn();
const mockGetBlockedCounterpartyIds = vi.fn();
const mockGetBlockRelationship = vi.fn();
const mockIsBlockedBetween = vi.fn();

vi.mock("@/lib/utils", () => ({
  hasEnvVars: true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

vi.mock("@/lib/blocks", () => ({
  getBlockRelationship: mockGetBlockRelationship,
  getBlockedCounterpartyIds: mockGetBlockedCounterpartyIds,
  isBlockedBetween: mockIsBlockedBetween,
}));

class MockQuery {
  private filters: Array<
    | { column: string; kind: "eq"; value: unknown }
    | { column: string; kind: "in"; value: unknown[] }
    | { column: string; kind: "is"; value: unknown }
  > = [];
  readonly orderCalls: Array<{ column: string; options?: unknown }> = [];

  constructor(private readonly result: unknown) {}

  eq(column: string, value: unknown) {
    this.filters.push({ column, kind: "eq", value });
    return this;
  }

  gte() {
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, kind: "in", value });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, kind: "is", value });
    return this;
  }

  limit() {
    return this;
  }

  lte() {
    return this;
  }

  maybeSingle() {
    const result = this.materializeResult();
    if (
      result &&
      typeof result === "object" &&
      "data" in result &&
      Array.isArray((result as { data: unknown }).data)
    ) {
      const { data, ...rest } = result as { data: unknown[] };
      return Promise.resolve({ ...rest, data: data[0] ?? null });
    }

    return Promise.resolve(result);
  }

  not() {
    return this;
  }

  or() {
    return this;
  }

  order(column: string, options?: unknown) {
    this.orderCalls.push({ column, options });
    return this;
  }

  select() {
    return this;
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.materializeResult()).then(onfulfilled, onrejected);
  }

  private materializeResult() {
    if (
      !this.result ||
      typeof this.result !== "object" ||
      !("data" in this.result) ||
      !Array.isArray((this.result as { data: unknown }).data)
    ) {
      return this.result;
    }

    const { data, ...rest } = this.result as { data: Array<Record<string, unknown>> };
    const filteredData = data.filter((row) =>
      this.filters.every((filter) => {
        if (filter.kind === "eq") {
          return row[filter.column] === filter.value;
        }

        if (filter.kind === "in") {
          return filter.value.includes(row[filter.column]);
        }

        return row[filter.column] === filter.value;
      }),
    );

    return { ...rest, data: filteredData };
  }
}

describe("getListingsFeed", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockCreateClient.mockReset();
    mockGetBlockedCounterpartyIds.mockReset();
    mockGetBlockedCounterpartyIds.mockResolvedValue([]);
    vi.resetModules();
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
    expect(supabase.from).toHaveBeenCalledWith("listings");
    expect(mockGetBlockedCounterpartyIds).toHaveBeenCalledWith("viewer-1");
  });

  it("hides listings from users who blocked the viewer", async () => {
    const listing = {
      archived_at: null,
      author: "Author",
      condition: "good",
      created_at: "2026-05-01T00:00:00.000Z",
      deleted_at: null,
      description: null,
      edition: null,
      id: "listing-1",
      listing_type: "sale_only",
      price: 20,
      primary_image_url: null,
      seller_id: "seller-1",
      status: "available",
      title: "Hidden Book",
    };
    const supabase = {
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === "listings") {
          return new MockQuery({ data: [listing], error: null });
        }

        if (table === "listing_images") {
          return new MockQuery({ data: [], error: null });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    mockCreateClient.mockResolvedValue(supabase);
    mockGetBlockedCounterpartyIds.mockResolvedValue(["seller-1"]);

    const { getListingsFeed } = await import("@/lib/marketplace");

    const { listings } = await getListingsFeed("authenticated", {}, 24, { viewerId: "viewer-1" });

    expect(listings).toEqual([]);
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
        sort: "price_asc",
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
      sort: "price_asc",
      studyAreaId: 3,
      universityId: 5,
    });
  });

  it("falls back to newest sorting for unsupported sort params", async () => {
    const { getListingsFeedFilters } = await import("@/lib/marketplace");

    expect(getListingsFeedFilters(new URLSearchParams("sort=random")).sort).toBe("newest");
    expect(getListingsFeedFilters(new URLSearchParams()).sort).toBe("newest");
  });

  it("orders listings by price ascending with null prices last", async () => {
    const listingsQuery = new MockQuery({ data: [], error: null });
    const supabase = {
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === "listings") {
          return listingsQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    mockCreateClient.mockResolvedValue(supabase);

    const { getListingsFeed } = await import("@/lib/marketplace");

    await getListingsFeed("authenticated", { sort: "price_asc" }, 24, {
      viewerId: "viewer-1",
    });

    expect(listingsQuery.orderCalls).toEqual([
      { column: "price", options: { ascending: true, nullsFirst: false } },
      { column: "created_at", options: { ascending: false } },
    ]);
  });

  it("orders listings by price descending with null prices last", async () => {
    const listingsQuery = new MockQuery({ data: [], error: null });
    const supabase = {
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn((table: string) => {
        if (table === "listings") {
          return listingsQuery;
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    mockCreateClient.mockResolvedValue(supabase);

    const { getListingsFeed } = await import("@/lib/marketplace");

    await getListingsFeed("authenticated", { sort: "price_desc" }, 24, {
      viewerId: "viewer-1",
    });

    expect(listingsQuery.orderCalls).toEqual([
      { column: "price", options: { ascending: false, nullsFirst: false } },
      { column: "created_at", options: { ascending: false } },
    ]);
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
    mockGetBlockedCounterpartyIds.mockReset();
    mockGetBlockRelationship.mockReset();
    mockIsBlockedBetween.mockReset();
    vi.resetModules();
  });

  it("does not treat cancelled transactions as pending request state", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "transactions") {
          return new MockQuery({
            data: [
              {
                buyer_id: "buyer-1",
                conversation_id: "conversation-cancelled",
                listing_id: "listing-1",
                offered_listing_id: null,
                request_type: "buy",
                status: "cancelled",
              },
              {
                buyer_id: "buyer-1",
                conversation_id: "conversation-declined",
                listing_id: "listing-1",
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

describe("blocked profile and listing visibility", () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockGetBlockedCounterpartyIds.mockReset();
    mockGetBlockRelationship.mockReset();
    mockIsBlockedBetween.mockReset();
    vi.resetModules();
  });

  it("hides a listing when the seller blocked the viewer", async () => {
    const listing = {
      archived_at: null,
      condition: "good",
      created_at: "2026-05-01T00:00:00.000Z",
      id: "listing-1",
      listing_type: "sale_only",
      price: 20,
      primary_image_url: null,
      seller_id: "seller-1",
      status: "available",
      title: "Hidden Book",
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "listings") {
          return new MockQuery({ data: listing, error: null });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);
    mockIsBlockedBetween.mockResolvedValue(true);

    const { getListingById } = await import("@/lib/marketplace");

    const result = await getListingById("listing-1", { viewerId: "viewer-1" });

    expect(result.listing).toBeNull();
  });

  it("allows a profile when the viewer blocked that user", async () => {
    const profile = {
      account_status: "active",
      avatar_url: null,
      bio: "Private",
      degree_id: null,
      email: "seller@example.com",
      first_name: "Seller",
      id: "seller-1",
      last_name: "User",
      role: "user",
      suspended_at: null,
      transactions_seen_at: null,
      university: "Massey",
      university_id: 1,
      username: "seller",
      year_level: null,
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return new MockQuery({ data: profile, error: null });
        }

        if (table === "listings") {
          return new MockQuery({ data: [], error: null });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);
    mockGetBlockRelationship.mockResolvedValue({
      blockedByMe: true,
      blockedMe: false,
    });

    const { getPublicProfile } = await import("@/lib/marketplace");

    const result = await getPublicProfile("seller", { viewerId: "viewer-1" });

    expect(result.profile?.id).toBe("seller-1");
    expect(result.blockedMe).toBe(false);
  });

  it("hides a profile when that user blocked the viewer", async () => {
    const profile = {
      account_status: "active",
      avatar_url: null,
      bio: "Private",
      degree_id: null,
      email: "seller@example.com",
      first_name: "Seller",
      id: "seller-1",
      last_name: "User",
      role: "user",
      suspended_at: null,
      transactions_seen_at: null,
      university: "Massey",
      university_id: 1,
      username: "seller",
      year_level: null,
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return new MockQuery({ data: profile, error: null });
        }

        if (table === "listings") {
          return new MockQuery({ data: [], error: null });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);
    mockGetBlockRelationship.mockResolvedValue({
      blockedByMe: false,
      blockedMe: true,
    });

    const { getPublicProfile } = await import("@/lib/marketplace");

    const result = await getPublicProfile("seller", { viewerId: "viewer-1" });

    expect(result.profile).toBeNull();
    expect(result.blockedMe).toBe(true);
  });

  it("allows admin bypass when the target blocked the admin viewer", async () => {
    const profile = {
      account_status: "active",
      avatar_url: null,
      bio: "Private",
      degree_id: null,
      email: "seller@example.com",
      first_name: "Seller",
      id: "seller-1",
      last_name: "User",
      role: "user",
      suspended_at: null,
      transactions_seen_at: null,
      university: "Massey",
      university_id: 1,
      username: "seller",
      year_level: null,
    };
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return new MockQuery({ data: profile, error: null });
        }

        if (table === "listings") {
          return new MockQuery({ data: [], error: null });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);

    const { getPublicProfile } = await import("@/lib/marketplace");

    const result = await getPublicProfile("seller", {
      bypassBlock: true,
      viewerId: "admin-a",
    });

    expect(result.profile?.id).toBe("seller-1");
    expect(mockGetBlockRelationship).not.toHaveBeenCalled();
  });

  it("separates active listings from previous sold listings on public profiles", async () => {
    const profile = {
      account_status: "active",
      avatar_url: null,
      bio: "Textbooks",
      degree_id: null,
      email: "seller@example.com",
      first_name: "Seller",
      id: "seller-1",
      last_name: "User",
      role: "user",
      suspended_at: null,
      transactions_seen_at: null,
      university: "Massey",
      university_id: 1,
      username: "seller",
      year_level: null,
    };
    const listings = [
      {
        archived_at: null,
        condition: "good",
        created_at: "2026-05-02T00:00:00.000Z",
        deleted_at: null,
        id: "active-1",
        listing_type: "sale_only",
        price: 25,
        primary_image_url: null,
        seller_id: "seller-1",
        status: "available",
        title: "Active Book",
      },
      {
        archived_at: "2026-05-03T00:00:00.000Z",
        condition: "good",
        created_at: "2026-05-01T00:00:00.000Z",
        deleted_at: null,
        id: "previous-1",
        listing_type: "sale_only",
        price: 20,
        primary_image_url: null,
        seller_id: "seller-1",
        status: "archived",
        title: "Sold Book",
      },
      {
        archived_at: "2026-05-04T00:00:00.000Z",
        condition: "fair",
        created_at: "2026-04-30T00:00:00.000Z",
        deleted_at: "2026-05-05T00:00:00.000Z",
        id: "hidden-1",
        listing_type: "sale_only",
        price: 10,
        primary_image_url: null,
        seller_id: "seller-1",
        status: "archived",
        title: "Hidden Book",
      },
    ];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return new MockQuery({ data: [profile], error: null });
        }

        if (table === "listings") {
          return new MockQuery({ data: listings, error: null });
        }

        if (table === "listing_images") {
          return new MockQuery({ data: [], error: null });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);

    const { getPublicProfile } = await import("@/lib/marketplace");

    const result = await getPublicProfile("seller");

    expect(result.profile?.listings.map((listing) => listing.id)).toEqual(["active-1"]);
    expect(result.profile?.previousListings.map((listing) => listing.id)).toEqual(["previous-1"]);
  });

  it("anonymizes reviewers in a blocked relationship", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "reviews") {
          return new MockQuery({
            data: [
              {
                comment: "Good trade.",
                created_at: "2026-05-01T00:00:00.000Z",
                id: "review-1",
                rating: 5,
                reviewee_id: "seller-1",
                reviewer: {
                  avatar_url: "avatar.png",
                  first_name: "Blocked",
                  id: "reviewer-1",
                  last_name: "User",
                  username: "blocked",
                },
                reviewer_id: "reviewer-1",
                reviewer_role: "buyer",
                transaction_id: "transaction-1",
              },
            ],
            error: null,
          });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);
    mockGetBlockedCounterpartyIds.mockResolvedValue(["reviewer-1"]);

    const { getSellerReviews } = await import("@/lib/marketplace");

    const reviews = await getSellerReviews("seller-1", "viewer-1");

    expect(reviews[0].comment).toBe("Good trade.");
    expect(reviews[0].reviewer).toBeNull();
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
