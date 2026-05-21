import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("listing form image and feedback behavior", () => {
  it("lets create-listing image previews be removed before upload", () => {
    const form = source("components/create-listing-form.tsx");

    expect(form).toContain("function removeSelectedImage");
    expect(form).toContain("URL.revokeObjectURL");
    expect(form).toContain("objectUrlsRef");
    expect(form).toContain("Remove");
    expect(form).toContain("setSelectedImageFiles");
  });

  it("uses a one-shot route toast instead of a persistent edit success banner", () => {
    const form = source("components/edit-listing-form.tsx");

    expect(form).toContain("LISTING_UPDATED_TOAST_STORAGE_KEY");
    expect(form).toContain("sessionStorage.setItem");
    expect(form).toContain('router.push("/home")');
    expect(form).not.toContain('state.status === "success"');
  });

  it("renders and consumes route toasts from session storage on the home dashboard", () => {
    const routeToast = source("components/route-toast.tsx");
    const homeDashboard = source("components/home-dashboard-panel.tsx");

    expect(routeToast).toContain("function RouteToast");
    expect(routeToast).toContain('role="status"');
    expect(routeToast).toContain("fixed bottom-6 right-6");
    expect(routeToast).toContain("sessionStorage.getItem");
    expect(routeToast).toContain("sessionStorage.removeItem");
    expect(homeDashboard).toContain("OneShotRouteToast");
  });
});
