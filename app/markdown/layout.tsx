import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: 'Markdown 预览 - 在线 Markdown 编辑与 HTML 导出',
  description:
    '免费在线 Markdown 预览工具，支持表格、代码块、任务列表等 GFM 语法，实时渲染并导出 HTML，纯浏览器本地处理。',
  keywords:
    'Markdown,md,Markdown预览,Markdown编辑器,Markdown转HTML,GFM,在线Markdown',
  alternates: {
    canonical: '/markdown',
  },
  openGraph: {
    title: 'Markdown 预览 - 在线 Markdown 编辑与 HTML 导出',
    description:
      '实时 Markdown 预览，支持表格、代码块、任务列表，一键复制或下载 HTML。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function MarkdownLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
