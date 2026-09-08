import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    qualities: [68, 75],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
