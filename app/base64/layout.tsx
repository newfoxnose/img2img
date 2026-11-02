import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: 'Base64 编解码工具 - 文本/文件在线转换',
  description:
    '免费在线 Base64 编码与解码工具，支持中文与 emoji、URL-Safe、data URL 前缀识别，以及图片/任意文件转 Base64，全部在浏览器本地完成。',
  keywords: 'Base64,Base64编码,Base64解码,文件转Base64,图片转Base64,URL-Safe,data URL',
  alternates: {
    canonical: '/base64',
  },
  openGraph: {
    title: 'Base64 编解码工具 - 文本/文件在线转换',
    description: '文本与文件 Base64 编码/解码，支持 URL-Safe 与图片预览，本地处理不上传。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function Base64Layout({ children }: { children: React.ReactNode }) {
  return <ToolLayout>{children}</ToolLayout>
}
