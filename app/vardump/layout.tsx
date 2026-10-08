import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'PHP var_dump格式化工具 - 在线调试输出美化',
  description:
    '专业的PHP var_dump输出格式化工具，在线免费使用。支持语法高亮、折叠展开、类型识别、数组对象解析等功能，让PHP调试更简单高效。无需注册，即时使用。',
  keywords:
    'PHP, var_dump, 格式化, 调试, 在线工具, 代码高亮, 数组解析, 对象解析, PHP调试工具',
  openGraph: {
    title: 'PHP var_dump格式化工具 - 在线调试输出美化',
    description:
      '专业的PHP var_dump输出格式化工具，在线免费使用。支持语法高亮、折叠展开、类型识别、数组对象解析等功能。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function VarDumpLayout({
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
