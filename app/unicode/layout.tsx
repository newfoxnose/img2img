import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: 'Unicode / UTF-8 转换工具 - 转义序列与 HTML 实体',
  description:
    '免费在线 Unicode 与 UTF-8 转换工具，支持文本与 \\u 转义序列、十六进制字节、HTML 数字实体、Base64 互转，正确处理中文与 emoji，本地处理不上传。',
  keywords: 'Unicode,UTF-8,Unicode转义,u4e2d,UTF-8字节,HTML实体,数字实体,乱码排查',
  alternates: {
    canonical: '/unicode',
  },
  openGraph: {
    title: 'Unicode / UTF-8 转换工具 - 转义序列与 HTML 实体',
    description: '文本与 Unicode 转义、UTF-8 字节、HTML 实体、Base64 双向互转。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function UnicodeLayout({ children }: { children: React.ReactNode }) {
  return <ToolLayout>{children}</ToolLayout>
}
