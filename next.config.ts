import type { NextConfig } from 'next'

import path from 'node:path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg'],
  outputFileTracingRoot: path.resolve(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mahasamvad.in',
      },
      {
        protocol: 'https',
        hostname: '**.mahasamvad.in',
      },
    ],
  },
}

export default nextConfig
