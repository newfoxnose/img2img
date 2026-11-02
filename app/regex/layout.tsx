import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: '正则表达式测试工具 - 在线正则匹配、高亮与替换',
  description:
    '免费在线正则表达式测试工具，实时高亮匹配结果与捕获分组，支持 g/i/m/s/u/y 标志、替换预览与常用正则模板，纯浏览器本地运行。',
  keywords:
    '正则,正则表达式,regex,regexp,正则测试,正则匹配,正则替换,在线正则,捕获分组',
  alternates: {
    canonical: '/regex',
  },
  openGraph: {
    title: '正则表达式测试工具 - 在线正则匹配、高亮与替换',
    description:
      '实时测试正则表达式，高亮匹配结果与分组，内置常用正则模板与替换预览。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function RegexLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
