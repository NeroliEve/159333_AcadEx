import { describe, expect, it } from "vitest";

import { normalizeLoginEmail } from "@/components/login-form";

describe("normalizeLoginEmail", () => {
  it("removes mobile keyboard whitespace and normalizes casing before auth", () => {
    expect(normalizeLoginEmail("  Student@Example.COM \n")).toBe(
      "student@example.com",
    );
  });
});
