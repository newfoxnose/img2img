import { NextRequest, NextResponse } from 'next/server'

/**
 * 获取客户端公网 IP
 * 优先从常见反向代理头中读取，降级到 Next.js 内置的 request.ip
 */
export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfIp = request.headers.get('cf-connecting-ip')
  const trueClientIp = request.headers.get('true-client-ip')
  const xClientIp = request.headers.get('x-client-ip')

  let ip =
    cfIp ||
    trueClientIp ||
    realIp ||
    xClientIp ||
    ''

  if (!ip && forwardedFor) {
    // x-forwarded-for 可能是逗号分隔的列表，第一个是客户端真实 IP
    ip = forwardedFor.split(',')[0].trim()
  }

  // 降级：Next.js 会在某些部署环境下自动填充 request.ip
  if (!ip) {
    ip = request.ip || 'unknown'
  }

  // 过滤 IPv6 本地地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1'
  }

  return NextResponse.json({ ip })
}
