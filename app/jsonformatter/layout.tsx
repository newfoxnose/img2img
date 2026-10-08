import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'JSON格式化工具 - 在线JSON格式化/验证/压缩',
  description:
    '专业的JSON格式化工具，在线免费使用。支持语法高亮、格式化/压缩、实时验证、树形视图等功能，让JSON数据处理更简单高效。无需注册，即时使用。',
  keywords:
    'JSON, 格式化, 验证, 在线工具, 代码高亮, JSON格式化, JSON验证, JSON美化, JSON压缩',
  openGraph: {
    title: 'JSON格式化工具 - 在线JSON格式化/验证/压缩',
    description:
      '专业的JSON格式化工具，在线免费使用。支持语法高亮、格式化/压缩、实时验证、树形视图等功能。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function JsonFormatterLayout({
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
