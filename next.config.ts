import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Required for Capacitor
  images: {
    unoptimized: true, // Static exports don't support Next.js Image Optimization
  },
  /* config options here */
};

export default nextConfig;
