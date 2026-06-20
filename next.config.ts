import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/kingdom-game",
  assetPrefix: "/kingdom-game/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;