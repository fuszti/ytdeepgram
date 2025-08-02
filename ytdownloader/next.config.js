/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // Enable experimental features if needed
  },
  env: {
    DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY,
  },
}

module.exports = nextConfig