import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH === "/bx-caller" ? "/bx-caller" : "";

const nextConfig: NextConfig = {
  basePath,
  output: "standalone",
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET ?? "http://localhost:8102";
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
