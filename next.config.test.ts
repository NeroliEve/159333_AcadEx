import { describe, expect, it } from "vitest";

import nextConfig from "@/next.config";

describe("next image configuration", () => {
  it("allows Supabase Storage image URLs", () => {
    expect(nextConfig.images?.remotePatterns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          hostname: "*.supabase.co",
          pathname: "/storage/v1/object/**",
          protocol: "https",
        }),
      ]),
    );
  });
});
