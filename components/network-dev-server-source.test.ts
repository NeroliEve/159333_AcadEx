import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("network dev server guardrails", () => {
  it.each([
    "components/edit-profile-form.tsx",
    "components/create-listing-form.tsx",
    "components/edit-listing-form.tsx",
  ])("%s uploads files through same-origin API routes", (path) => {
    const form = source(path);

    expect(form).not.toContain('from "@/lib/supabase/client"');
    expect(form).not.toContain(".storage");
    expect(form).toContain('fetch("/api/storage/uploads"');
  });
});
