import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.prod-images.emergentagent.com",
      },
      {
        protocol: "https",
        hostname: "customer-assets.emergentagent.com",
      },
    ],
  },
};

export default nextConfig;
