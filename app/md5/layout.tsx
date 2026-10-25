import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'MD5 计算工具 - 在线生成MD5哈希值',
  description:
    '免费在线 MD5 计算工具，输入文本即可生成 MD5 哈希值，支持大小写切换、批量计算，纯浏览器本地处理，数据不上传。',
  keywords:
    'MD5,MD5计算,MD5哈希,在线MD5,哈希计算,加密,文本加密',
  openGraph: {
    title: 'MD5 计算工具 - 在线生成MD5哈希值',
    description:
      '免费在线 MD5 计算工具，输入文本即可生成 MD5 哈希值，纯浏览器本地处理。',
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
