import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.7"],
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/**",
        protocol: "https",
      },
      {
        hostname: "localhost",
        pathname: "/storage/v1/object/**",
        port: "54321",
        protocol: "http",
      },
      {
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/**",
        port: "54321",
        protocol: "http",
      },
      {
        hostname: "covers.openlibrary.org",
        pathname: "/b/**",
        protocol: "https",
      },
      {
        hostname: "i.pravatar.cc",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
