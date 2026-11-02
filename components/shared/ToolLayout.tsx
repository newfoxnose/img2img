import Link from 'next/link'
import Footer from './Footer'

/**
 * 工具页统一外壳：顶部返回导航 + 内容 + 页脚
 * 新工具页的 layout.tsx 直接复用它，避免每页重复导航代码
 */
export default function ToolLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <nav className="border-b border-gray-200/60 bg-white/70 backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/70">
        <div className="container-responsive py-3">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            工具合集
          </Link>
        </div>
      </nav>
      {children}
      <Footer />
    </div>
  )
}
