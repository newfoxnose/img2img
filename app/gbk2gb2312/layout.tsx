import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'GBK转GB2312字符转换工具 - 在线智能替换GBK扩展字',
  description:
    '在线GBK转GB2312字符转换工具，智能检测GB2312外的GBK扩展字，按发音与字形优先级自动替换为最接近的GB2312字符，实时输出可复制的兼容文本，保障系统与排版要求。',
  keywords:
    'GBK, GB2312, 字符转换, 中文编码, 相似字符替换, 发音匹配, 在线工具',
  openGraph: {
    title: 'GBK转GB2312字符转换工具 - 在线智能替换GBK扩展字',
    description:
      '智能识别并替换GBK字符集中不属于GB2312的汉字，提供同音同形优先的替换结果，快速获得兼容文本。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function GbkToGb2312Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-50 min-h-screen">
      <nav className="bg-white border-b border-gray-200">
        <div className="container-responsive py-3">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            工具合集
          </Link>
        </div>
      </nav>
      {children}
    </div>
  )
}
