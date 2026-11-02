import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: 'JWT 解析工具 - 在线解码 JWT Header 与 Payload',
  description:
    '免费在线 JWT 解析工具，实时解码 JWT 的 Header 与 Payload，展示 exp / iat / nbf 本地与 UTC 时间及过期状态，浏览器本地解码，不上传 Token。',
  keywords:
    'jwt,jwt解析,jwt解码,token解析,payload,header,bearer,exp,iat,jwt在线工具',
  alternates: {
    canonical: '/jwt',
  },
  openGraph: {
    title: 'JWT 解析工具 - 在线解码 JWT Header 与 Payload',
    description:
      '解析 JWT 的 Header 与 Payload，展示签发/过期时间与过期状态，本地解码不上传。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function JwtLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
