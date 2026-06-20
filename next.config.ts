import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',          // Generate static HTML/CSS/JS in /out
  basePath: '/kingdom-game', // Match the GitHub Pages repo name
  images: { unoptimized: true },
};

export default nextConfig;
