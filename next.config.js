/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允许处理图片格式
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // 配置模型文件缓存
  async headers() {
    return [
      {
        source: '/models/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', // 长期缓存大文件
          },
        ],
      },
    ]
  },

  // 配置 Next.js 转译 onnxruntime-web（包含 .mjs 文件）
  transpilePackages: ['onnxruntime-web'],

  // 配置 webpack 以支持浏览器端推理相关依赖
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 在客户端构建中，忽略 Node.js 模块，避免引入不必要的依赖
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        encoding: false,
        child_process: false,
        worker_threads: false,
      }
    }
    // 忽略 node-fetch 的 encoding 依赖警告
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch/ },
      { message: /Can't resolve 'encoding'/ },
    ]

    // Prevent Terser from misfiring on this file
    config.module.rules.push({
      test: /ort\.node\.min/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    },{
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });
    return config
  },
  // If you're using static exports
  output: 'export',
  trailingSlash: true,
}

module.exports = nextConfig

