import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/shared/Footer'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: '关于我们 - 在线工具合集',
  description: '在线工具合集的定位、处理方式与联系方式，所有工具均在浏览器本地运行。',
  alternates: { canonical: `${SITE_URL}/about` },
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container-responsive py-10">
        <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          工具合集
        </Link>
        <article className="max-w-3xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">关于我们</h1>
          <div className="space-y-4 text-gray-600 dark:text-gray-300 leading-relaxed">
            <p>
              在线工具合集是一个面向普通用户和开发者的免费在线工具箱，提供图片处理、编码转换、哈希计算、
              JSON 格式化、时间日期与网络查询等常用功能。
            </p>
            <p>
              我们的核心原则是<strong className="text-gray-900 dark:text-white">本地处理、即开即用</strong>：
              除本机 IP 查询需要读取请求头、二维码识别等必要功能外，图片、文本和数据均在您的浏览器内完成处理，
              不会上传到服务器，也不会要求注册登录。
            </p>
            <p>
              如果您有功能建议、发现问题或希望合作，欢迎通过站点页脚的联系方式与我们沟通。
              我们会持续更新更多实用工具，并保持完全免费。
            </p>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  )
}
