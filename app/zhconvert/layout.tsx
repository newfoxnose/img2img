import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: '简繁转换 - 简体中文与繁体中文在线互转',
  description:
    '免费在线简繁转换工具，支持简体转繁体（台湾/香港用词）与繁体转简体，基于 OpenCC 词库，实时转换，本地处理。',
  keywords:
    '简繁转换,简体转繁体,繁体转简体,中文转换,OpenCC,台湾繁体,香港繁体',
  alternates: {
    canonical: '/zhconvert',
  },
  openGraph: {
    title: '简繁转换 - 简体中文与繁体中文在线互转',
    description:
      '支持简体与繁体中文互转，覆盖台湾/香港用词，实时转换并一键复制。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function ZhConvertLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
