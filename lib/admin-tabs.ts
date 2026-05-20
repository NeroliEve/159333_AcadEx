export const adminTabs = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "listings", label: "Listings" },
  { id: "reports", label: "Reports" },
  { id: "audit", label: "Audit" },
  { id: "catalog", label: "Catalog" },
] as const;

export type AdminTab = (typeof adminTabs)[number]["id"];

export const defaultAdminTab: AdminTab = "overview";
export const adminTabStorageKey = "acadex.admin.activeTab";

const adminTabIds = new Set<string>(adminTabs.map((tab) => tab.id));

export function parseAdminTab(value: string | null | undefined): AdminTab {
  return value && adminTabIds.has(value) ? (value as AdminTab) : defaultAdminTab;
}

export function buildAdminTabHref(
  pathname: string,
  currentSearchParams: URLSearchParams | string,
  tab: AdminTab,
) {
  const nextSearchParams = new URLSearchParams(
    typeof currentSearchParams === "string"
      ? currentSearchParams
      : currentSearchParams.toString(),
  );

  if (tab === defaultAdminTab) {
    nextSearchParams.delete("tab");
  } else {
    nextSearchParams.set("tab", tab);
  }

  const query = nextSearchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
