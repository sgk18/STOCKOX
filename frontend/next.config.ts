import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["recharts", "react-is"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "finnhub.io",
      },
      {
        protocol: "https",
        hostname: "cdn.finnhub.io",
      },
      {
        protocol: "https",
        hostname: "logo.clearbit.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
