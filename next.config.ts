import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No standalone output needed — Vercel handles deployment packaging
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
