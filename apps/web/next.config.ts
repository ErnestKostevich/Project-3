import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow the Chrome extension origin to call our API in dev.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  transpilePackages: ['@pluck/shared'],
};

export default nextConfig;
