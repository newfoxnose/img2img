import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: 'URL 编解码工具 - URLEncode/URLDecode 与参数解析',
  description:
    '免费在线 URL 编码解码工具，支持 encodeURIComponent 与 encodeURI 两种方式，并可将完整 URL 或查询字符串自动解析为参数表格，本地处理不上传。',
  keywords: 'URL编码,URL解码,URLEncode,URLDecode,encodeURIComponent,encodeURI,查询参数解析',
  alternates: {
    canonical: '/urlcodec',
  },
  openGraph: {
    title: 'URL 编解码工具 - URLEncode/URLDecode 与参数解析',
    description: '支持组件编码与整段 URL 处理，自动拆解查询参数为表格。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function UrlCodecLayout({ children }: { children: React.ReactNode }) {
  return <ToolLayout>{children}</ToolLayout>
}
