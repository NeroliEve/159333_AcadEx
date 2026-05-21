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

  it("prevents authenticated users from updating sensitive profile columns directly", () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
      .join("\n")
      .replace(/\s+/g, " ");

    expect(migrationSql).toMatch(
      /revoke update on table public\.profiles from authenticated/i,
    );
    expect(migrationSql).toMatch(/grant update \([^)]+\) on table public\.profiles to authenticated/i);
    expect(migrationSql).not.toMatch(
      /grant update \([^)]*\b(role|account_status|suspended_at|suspended_by)\b[^)]*\) on table public\.profiles to authenticated/i,
    );
    expect(migrationSql).toMatch(/drop column if exists is_verified/i);
    expect(migrationSql).toMatch(
      /drop policy if exists "profiles_update_self_or_admin" on public\.profiles/i,
    );
    expect(migrationSql).toMatch(
      /drop policy if exists "profiles_update_own" on public\.profiles/i,
    );
  });

  it("allows public reads of non-deleted listings so sold listings can appear on profiles", () => {
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const migrationSql = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
      .join("\n")
      .replace(/\s+/g, " ");

    expect(migrationSql).toMatch(
      /drop policy if exists "listings_select_anon_available" on public\.listings/i,
    );
    expect(migrationSql).toMatch(
      /create policy "listings_select_public_non_deleted" on public\.listings for select to anon, authenticated using \(deleted_at is null\)/i,
    );
  });
});
