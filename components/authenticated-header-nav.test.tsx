import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AuthenticatedHeaderNav,
  HeaderNavLinks,
} from "@/components/authenticated-header-nav";

const userProps = {
  email: "student@example.com",
  isAdmin: false,
  isSuspended: false,
  showAdminBackButton: false,
  userId: "user-1",
};

describe("AuthenticatedHeaderNav", () => {
  it("renders core marketplace links for authenticated users", () => {
    const markup = renderToStaticMarkup(
      <AuthenticatedHeaderNav {...userProps} />,
    );

    expect(markup).toContain("href=\"/home\"");
    expect(markup).toContain("href=\"/browse\"");
    expect(markup).toContain("href=\"/profile/saved\"");
    expect(markup).toContain("href=\"/profile/transactions\"");
    expect(markup).toContain("href=\"/messages\"");
    expect(markup).toContain("href=\"/listings/new\"");
  });

  it("shows the unread messages badge in top-level nav links", () => {
    const markup = renderToStaticMarkup(
      <HeaderNavLinks unreadCount={7} />,
    );

    expect(markup).toContain("Messages");
    expect(markup).toContain(">7</span>");
  });

  it("hides the unread messages badge at zero", () => {
    const markup = renderToStaticMarkup(
      <HeaderNavLinks unreadCount={0} />,
    );

    expect(markup).toContain("Messages");
    expect(markup).not.toContain(">0</span>");
  });

  it("keeps authenticated account controls aligned right on mobile", () => {
    const markup = renderToStaticMarkup(
      <AuthenticatedHeaderNav {...userProps} isAdmin />,
    );

    expect(markup).toContain("justify-end gap-4 lg:justify-between");
  });

  it("keeps marketplace links hidden for suspended users", () => {
    const markup = renderToStaticMarkup(
      <AuthenticatedHeaderNav {...userProps} isSuspended />,
    );

    expect(markup).toContain("Marketplace access suspended");
    expect(markup).not.toContain("href=\"/browse\"");
    expect(markup).not.toContain("href=\"/messages\"");
    expect(markup).not.toContain("href=\"/profile/saved\"");
    expect(markup).not.toContain("href=\"/profile/transactions\"");
    expect(markup).not.toContain("href=\"/listings/new\"");
  });
});
