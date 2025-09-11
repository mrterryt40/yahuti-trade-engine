/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [
      'localhost',
      'i.ebayimg.com',
      'thumbs.ebayimg.com',
      'ir.ebaystatic.com',
      'p.ebayimg.com',
      's3.amazonaws.com',
      'images.unsplash.com',
      'picsum.photos',
      'images.g2a.com'
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig