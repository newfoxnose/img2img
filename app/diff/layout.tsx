import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: '文本对比工具 - 在线行级 Diff 差异对比',
  description:
    '免费在线文本对比工具，逐行比较两段文本或代码的差异，高亮新增、删除与修改内容，支持忽略空白和大小写，全部在浏览器本地完成。',
  keywords:
    '文本对比,代码对比,diff,差异对比,在线比对,文本比较,代码比较,行级对比',
  alternates: {
    canonical: '/diff',
  },
  openGraph: {
    title: '文本对比工具 - 在线行级 Diff 差异对比',
    description:
      '逐行比较两段文本或代码的差异，高亮新增、删除与修改，支持忽略空白与大小写。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function DiffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
