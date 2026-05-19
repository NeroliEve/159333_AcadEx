import { describe, expect, it } from "vitest";

import {
  getUserMenuMessageRealtimeFilters,
  getUserMenuTransactionRealtimeFilters,
} from "@/components/user-menu";

describe("user menu realtime filters", () => {
  it("filters transaction notifications to rows involving the viewer", () => {
    expect(getUserMenuTransactionRealtimeFilters("user-1")).toEqual([
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

  it("filters unread message notifications away from the viewer's own sends", () => {
    expect(getUserMenuMessageRealtimeFilters("user-1")).toEqual([
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
});
