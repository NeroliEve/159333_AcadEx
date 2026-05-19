import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

describe("Supabase migrations", () => {
  it("removes the legacy one-conversation constraint for repeat request attempts", () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
      .join("\n");

    expect(migrationSql).toMatch(
      /alter table public\.conversations\s+drop constraint if exists conversations_listing_buyer_seller_key/i,
    );
  });
});
