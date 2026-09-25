import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "juhffafyorfjtahscups.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  serverExternalPackages: ["sharp"],
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/ranjeet/admin",
        permanent: false,
      },
      {
        source: "/ranjeet/dmin",
        destination: "/ranjeet/admin",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
