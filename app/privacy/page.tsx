import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/shared/Footer'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: '隐私政策 - 在线工具合集',
  description: '在线工具合集的隐私政策：数据处理方式、Cookie 与第三方统计说明。',
  alternates: { canonical: `${SITE_URL}/privacy` },
}

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">隐私政策</h1>
          <div className="space-y-5 text-gray-600 dark:text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">1. 数据处理</h2>
              <p>
                图片转换、压缩、证件照、编码转换、哈希、JSON、文本对比等工具全部在浏览器本地运行，
                输入内容和文件不会上传到我们的服务器。关闭页面后，相关数据即从内存中释放。
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2. 网络请求</h2>
              <p>
                本机 IP 查询会请求本站接口读取请求头中的公网 IP；IP 归属地查询会向第三方 IP 数据库发起请求。
                二维码识别、Markdown 预览等功能的依赖库在您的浏览器内加载，不会上传您的输入。
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">3. 本地存储</h2>
              <p>
                站点使用 localStorage 保存您的主题偏好和最近使用记录，这些数据仅保存在您的设备上，可随时通过清除浏览器数据删除。
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">4. 第三方服务</h2>
              <p>
                站点使用 Matomo 进行匿名访问统计，并可能展示 Google AdSense 广告。第三方服务可能使用 Cookie，
                具体以其隐私政策为准。我们不会主动出售或共享您的个人信息。
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">5. 联系我们</h2>
              <p>如对隐私政策有疑问，可通过站点页脚的联系方式与我们沟通。</p>
            </section>
            <p className="text-sm text-gray-400 dark:text-gray-500">最后更新：2026 年 11 月</p>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  )
}
