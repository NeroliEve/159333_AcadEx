import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("delete listing confirmation", () => {
  it("uses an in-app dialog instead of the native browser confirm", () => {
    const deleteListingButton = source("components/delete-listing-button.tsx");

    expect(deleteListingButton).not.toMatch(/\bconfirm\(/);
    expect(deleteListingButton).toContain('role="dialog"');
    expect(deleteListingButton).toContain('aria-modal="true"');
    expect(deleteListingButton).toContain("Delete listing?");
    expect(deleteListingButton).toContain("Cancel");
  });
});
