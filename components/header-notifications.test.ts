import { describe, expect, it } from "vitest";

import {
  formatHeaderNotificationCount,
  getHeaderMessageRealtimeFilters,
  getHeaderTransactionRealtimeFilters,
} from "@/components/header-notifications";

describe("header notifications", () => {
  it("formats notification counts for badges", () => {
    expect(formatHeaderNotificationCount(0)).toBe("0");
    expect(formatHeaderNotificationCount(12)).toBe("12");
    expect(formatHeaderNotificationCount(100)).toBe("99+");
  });

  it("keeps message realtime filters scoped to unread messages for the viewer", () => {
    expect(getHeaderMessageRealtimeFilters("user-1")).toEqual([
      {
        event: "UPDATE",
        filter: "sender_id=neq.user-1",
        schema: "public",
        table: "messages",
      },
      {
        event: "INSERT",
        filter: "buyer_id=eq.user-1",
        schema: "public",
        table: "conversations",
      },
      {
        event: "UPDATE",
        filter: "buyer_id=eq.user-1",
        schema: "public",
        table: "conversations",
      },
      {
        event: "INSERT",
        filter: "seller_id=eq.user-1",
        schema: "public",
        table: "conversations",
      },
      {
        event: "UPDATE",
        filter: "seller_id=eq.user-1",
        schema: "public",
        table: "conversations",
      },
    ]);
  });

  it("keeps transaction realtime filters scoped to rows involving the viewer", () => {
    expect(getHeaderTransactionRealtimeFilters("user-1")).toEqual([
      {
        event: "INSERT",
        filter: "buyer_id=eq.user-1",
        schema: "public",
        table: "transactions",
      },
      {
        event: "UPDATE",
        filter: "buyer_id=eq.user-1",
        schema: "public",
        table: "transactions",
      },
      {
        event: "INSERT",
        filter: "seller_id=eq.user-1",
        schema: "public",
        table: "transactions",
      },
      {
        event: "UPDATE",
        filter: "seller_id=eq.user-1",
        schema: "public",
        table: "transactions",
      },
      {
        event: "UPDATE",
        filter: "id=eq.user-1",
        schema: "public",
        table: "profiles",
      },
    ]);
  });
});
