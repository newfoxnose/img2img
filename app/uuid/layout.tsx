import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: 'UUID / 随机密码生成器 - 在线批量生成 UUID v4 与随机字符串',
  description:
    '免费在线 UUID 与随机密码生成工具，支持批量生成 UUID v4、NanoID 风格随机 ID、可配置字符集的随机密码，全部在浏览器本地生成，数据不上传。',
  keywords:
    'uuid,uuid生成,uuid v4,guid,随机密码,密码生成器,nanoid,随机字符串,随机id,批量生成',
  alternates: {
    canonical: '/uuid',
  },
  openGraph: {
    title: 'UUID / 随机密码生成器 - 在线批量生成 UUID v4 与随机字符串',
    description:
      '批量生成 UUID v4、NanoID 风格随机 ID 与随机密码，可配置长度和字符集，浏览器本地生成。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function UuidLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
