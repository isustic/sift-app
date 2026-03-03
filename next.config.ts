import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Next.js 16 uses Turbopack by default - set root to frontend dir
  // so CSS @imports (tailwindcss, tw-animate-css, shadcn) resolve correctly.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
