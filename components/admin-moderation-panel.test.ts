import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "components", "admin-moderation-panel.tsx"),
  "utf8",
);

describe("AdminModerationPanel user change tracking", () => {
  it("keeps lazily loaded users as the save baseline", () => {
    expect(source).toContain(
      "const [userBaselinesById, setUserBaselinesById] = useState",
    );
    expect(source).toContain("buildUserBaselines(initialUsers)");
    expect(source).toContain("setUserBaselinesById(buildUserBaselines(initialUsers));");
    expect(source).toContain("setUserBaselinesById(buildUserBaselines(payload.data.users));");
    expect(source).toContain("userBaselinesById.get(userId)");
    expect(source).toContain("userBaselinesById.get(managedUser.id)");
  });

  it("checks every editable user field before allowing save", () => {
    const match = source.match(/const hasProfileChanges =([\s\S]*?);/);

    expect(match?.[1]).toContain("first_name");
    expect(match?.[1]).toContain("last_name");
    expect(match?.[1]).toContain("username");
    expect(match?.[1]).toContain("bio");
    expect(match?.[1]).toContain("university_id");
    expect(match?.[1]).toContain("role");
    expect(match?.[1]).toContain("account_status");
    expect(match?.[1]).toContain("is_verified");
  });
});
