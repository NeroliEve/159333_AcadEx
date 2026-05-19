import { describe, expect, it } from "vitest";

import {
  adminTabStorageKey,
  buildAdminTabHref,
  parseAdminTab,
} from "@/lib/admin-tabs";

describe("parseAdminTab", () => {
  it("keeps valid admin tabs from the URL", () => {
    expect(parseAdminTab("users")).toBe("users");
    expect(parseAdminTab("listings")).toBe("listings");
    expect(parseAdminTab("catalog")).toBe("catalog");
  });

  it("falls back to overview for missing or invalid tabs", () => {
    expect(parseAdminTab(null)).toBe("overview");
    expect(parseAdminTab("")).toBe("overview");
    expect(parseAdminTab("unknown")).toBe("overview");
  });
});

describe("buildAdminTabHref", () => {
  it("writes non-overview tabs into the URL while preserving other search params", () => {
    const searchParams = new URLSearchParams("filter=pending&tab=overview");

    expect(buildAdminTabHref("/admin", searchParams, "users")).toBe(
      "/admin?filter=pending&tab=users",
    );
  });

  it("removes the tab query param for the default overview tab", () => {
    const searchParams = new URLSearchParams("filter=pending&tab=users");

    expect(buildAdminTabHref("/admin", searchParams, "overview")).toBe(
      "/admin?filter=pending",
    );
  });
});

describe("adminTabStorageKey", () => {
  it("names the persisted admin tab state", () => {
    expect(adminTabStorageKey).toBe("acadex.admin.activeTab");
  });
});
