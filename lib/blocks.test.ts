import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateAdminClient = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

class MockQuery {
  constructor(private readonly result: unknown) {}

  or() {
    return this;
  }

  limit() {
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

describe("block relationship helpers", () => {
  beforeEach(() => {
    mockCreateAdminClient.mockReset();
    vi.resetModules();
  });

  it("detects when the viewer blocked the other user", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => new MockQuery({
        data: [{ blocker_id: "viewer", blocked_id: "other" }],
        error: null,
      })),
    });

    const { isBlockedBetween } = await import("@/lib/blocks");

    await expect(isBlockedBetween("viewer", "other")).resolves.toBe(true);
  });

  it("detects when the other user blocked the viewer", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => new MockQuery({
        data: [{ blocker_id: "other", blocked_id: "viewer" }],
        error: null,
      })),
    });

    const { isBlockedBetween } = await import("@/lib/blocks");

    await expect(isBlockedBetween("viewer", "other")).resolves.toBe(true);
  });

  it("reports blockedMe when a regular user blocked an admin viewer", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => new MockQuery({
        data: [{ blocker_id: "regular-b", blocked_id: "admin-a" }],
        error: null,
      })),
    });

    const { getBlockRelationship } = await import("@/lib/blocks");

    await expect(getBlockRelationship("admin-a", "regular-b")).resolves.toEqual({
      blockedByMe: false,
      blockedMe: true,
    });
  });

  it("reports blockedByMe when the regular blocker views the admin", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => new MockQuery({
        data: [{ blocker_id: "regular-b", blocked_id: "admin-a" }],
        error: null,
      })),
    });

    const { getBlockRelationship } = await import("@/lib/blocks");

    await expect(getBlockRelationship("regular-b", "admin-a")).resolves.toEqual({
      blockedByMe: true,
      blockedMe: false,
    });
  });

  it("reports directional regular-to-regular block state", async () => {
    mockCreateAdminClient.mockReturnValue({
      from: vi.fn(() => new MockQuery({
        data: [{ blocker_id: "regular-a", blocked_id: "regular-b" }],
        error: null,
      })),
    });

    const { getBlockRelationship } = await import("@/lib/blocks");

    await expect(getBlockRelationship("regular-a", "regular-b")).resolves.toEqual({
      blockedByMe: true,
      blockedMe: false,
    });
    await expect(getBlockRelationship("regular-b", "regular-a")).resolves.toEqual({
      blockedByMe: false,
      blockedMe: true,
    });
  });
});
