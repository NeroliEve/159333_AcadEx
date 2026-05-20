import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("mobile responsiveness guardrails", () => {
  it("uses mobile-safe spacing in shared app and admin layouts", () => {
    expect(source("app/(app)/layout.tsx")).toContain("px-4 py-8 sm:px-6 sm:py-12");
    expect(source("app/admin/layout.tsx")).toContain("px-4 py-8 sm:px-6 sm:py-12");
    expect(source("app/(app)/layout.tsx")).toContain("px-4 sm:px-6 lg:px-16");
    expect(source("app/admin/layout.tsx")).toContain("px-4 sm:px-6 lg:px-16");
  });

  it("keeps the shared header compact on small phones", () => {
    const header = source("components/site-header.tsx");

    expect(header).toContain("sm:hidden");
    expect(header).toContain("hidden h-8 w-auto sm:block");
  });

  it("stacks dense auth and search controls before the small breakpoint", () => {
    expect(source("components/sign-up-form.tsx")).toContain("grid gap-4 sm:grid-cols-2");
    expect(source("components/ai-search-bar.tsx")).toContain("flex flex-col gap-2 sm:flex-row");
  });

  it("keeps loading skeleton widths within narrow mobile containers", () => {
    expect(source("app/(app)/listings/new/page.tsx")).toContain("w-96 max-w-full");
  });

  it("allows report modals to scroll within short mobile viewports", () => {
    expect(source("components/report-button.tsx")).toContain("max-h-[85vh] w-full max-w-md overflow-y-auto");
  });

  it("keeps fill images inside positioned listing image links", () => {
    const carousel = source("components/listing-image-carousel.tsx");

    expect(carousel).toContain('className="relative block h-full w-full"');
  });
});
