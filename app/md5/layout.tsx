import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '哈希计算工具 - MD5/SHA-1/SHA-256/SHA-512/HMAC',
  description:
    '免费在线哈希计算工具，支持 MD5、SHA-1、SHA-256、SHA-512 与 HMAC，文本批量与文件拖拽计算，纯浏览器本地处理，数据不上传。',
  keywords:
    'MD5,MD5计算,SHA1,SHA256,SHA512,HMAC,哈希计算,文件校验,在线哈希',
  alternates: {
    canonical: '/md5',
  },
  openGraph: {
    title: '哈希计算工具 - MD5/SHA-1/SHA-256/SHA-512/HMAC',
    description:
      '支持 MD5、SHA-1、SHA-256、SHA-512 与 HMAC，文本批量与文件拖拽计算，浏览器本地处理。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function Md5Layout({
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
