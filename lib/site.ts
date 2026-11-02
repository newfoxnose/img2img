/**
 * 站点级配置
 * 部署时可通过 NEXT_PUBLIC_SITE_URL 指定正式域名，用于 canonical 与 sitemap
 */
export const SITE_NAME = '在线工具合集'

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://tools.gm.ws'
).replace(/\/$/, '')

export const SITE_DESCRIPTION =
  '免费在线工具合集：图片处理、编码转换、哈希计算、JSON 格式化、时间戳、IP 查询等实用工具。所有处理在浏览器本地完成，安全无需上传。'
