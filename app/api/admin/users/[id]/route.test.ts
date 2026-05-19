import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("admin user update route", () => {
  it("uses the service-role client for profile updates after authorizing the viewer", () => {
    const routeSource = readFileSync(
      path.join(process.cwd(), "app", "api", "admin", "users", "[id]", "route.ts"),
      "utf8",
    );

    expect(routeSource).toContain('import { createAdminClient } from "@/lib/supabase/admin";');
    expect(routeSource).toMatch(/const adminSupabase = createAdminClient\(\)/);
    expect(routeSource).toMatch(/await adminSupabase\s*\.from\("profiles"\)\s*\.update\(/);
  });
});
