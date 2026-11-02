import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '本机IP查询工具 - 在线查看本地IP与公网IP',
  description:
    '免费在线查询本机IP地址工具，支持显示局域网本地IP（WebRTC）和公网IP，一键复制。无需安装，打开即用，所有信息在浏览器端获取。',
  keywords:
    '本机IP,本地IP,公网IP,IP查询,IP地址,内网IP,WebRTC,在线IP工具,IP归属地',
  alternates: {
    canonical: '/ip',
  },
  openGraph: {
    title: '本机IP查询工具 - 在线查看本地IP与公网IP',
    description:
      '免费在线查询本机IP地址，显示局域网本地IP和公网IP，一键复制。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function IpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container-responsive py-3">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
