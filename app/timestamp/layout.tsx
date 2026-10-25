import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '时间戳转换工具 - Unix时间戳与日期互转',
  description:
    '免费在线时间戳转换工具，支持 Unix 时间戳（秒/毫秒）与日期时间互转，自动识别单位，显示当前时间戳，支持本地时区与 UTC。',
  keywords:
    '时间戳转换,Unix时间戳,时间戳转日期,日期转时间戳,在线时间戳,时间戳工具',
  openGraph: {
    title: '时间戳转换工具 - Unix时间戳与日期互转',
    description:
      '免费在线时间戳转换工具，支持 Unix 时间戳与日期时间互转，自动识别单位。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function TimestampLayout({
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
