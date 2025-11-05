/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允许处理图片格式
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // 配置 webpack 以支持 face-api.js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 在客户端构建中，忽略 Node.js 模块
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
    }
    return config
  },
}

module.exports = nextConfig

