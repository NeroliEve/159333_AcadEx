import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessagesModerationNotice } from "@/components/messages-shell";

describe("MessagesModerationNotice", () => {
  it("reminds users that admins can review chats and warns against sensitive details", () => {
    const markup = renderToStaticMarkup(<MessagesModerationNotice />);

    expect(markup).toContain("Chats may be reviewed by admins");
    expect(markup).toContain("avoid sharing sensitive, private, or confidential details");
  });
});
