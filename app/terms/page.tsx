import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/shared/Footer'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: '使用条款 - 在线工具合集',
  description: '在线工具合集的使用条款：服务说明、使用规范与免责声明。',
  alternates: { canonical: `${SITE_URL}/terms` },
}

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">使用条款</h1>
          <div className="space-y-5 text-gray-600 dark:text-gray-300 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">1. 服务说明</h2>
              <p>本站提供免费的在线工具，按“现状”提供，不保证服务永不中断或完全无错误。</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">2. 使用规范</h2>
              <p>请勿利用本站工具处理违法内容、侵犯他人权益或进行任何违反当地法律法规的活动。</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">3. 结果准确性</h2>
              <p>
                哈希、编码、格式化、单位换算等结果仅供参考。涉及生产环境或关键业务时，请自行复核结果。
                证件照、二维码等输出请确认符合使用场景的要求。
              </p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">4. 免责声明</h2>
              <p>
                因使用或无法使用本站工具造成的任何直接或间接损失，本站不承担责任。
                请在处理重要数据前做好备份。
              </p>
            </section>
            <p className="text-sm text-gray-400 dark:text-gray-500">最后更新：2026 年 11 月</p>
          </div>
        </article>
      </div>
      <Footer />
    </main>
  )
}
