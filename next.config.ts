import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    // Fill the large editorial gap between 1200 and 1920 without multiplying
    // formats or altering the source masters.
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048, 3840],
    qualities: [68, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/shootings/**',
        search: '',
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
