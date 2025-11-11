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

      // 忽略仅在 Node.js 环境下可用的 onnxruntime-node，避免打包报错
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
      }

      config.externals = [...(config.externals || []), 'onnxruntime-node'];
    } else {
      // 服务端同样忽略 onnxruntime-node，保持构建一致性
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
      }
    }
    // 忽略 node-fetch 的 encoding 依赖警告
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch/ },
      { message: /Can't resolve 'encoding'/ },
    ]

    // Prevent Terser from misfiring on this file
    config.module.rules.push({
      test: /ort\.node\.min\.mjs$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });
    return config
  },
}

module.exports = nextConfig

