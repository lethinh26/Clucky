import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Docker uses the minimal server; local start/Playwright keep the normal build.
  output: process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default createNextIntlPlugin('./i18n/request.ts')(nextConfig);
