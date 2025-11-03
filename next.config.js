/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允许处理图片格式
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

module.exports = nextConfig

