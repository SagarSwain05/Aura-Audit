import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone', // required for Docker/Railway deployment
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
  // In production, Next.js talks directly to the server — no proxy needed.
  // The client browser uses NEXT_PUBLIC_API_URL directly.
}

export default nextConfig
