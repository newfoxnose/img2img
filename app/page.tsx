import Link from 'next/link'
import Footer from '@/components/shared/Footer'
import HomeTools from '@/components/home/HomeTools'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: 'zh-CN',
    },
    {
      '@type': 'ItemList',
      name: '在线工具列表',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '图片处理', url: `${SITE_URL}/image` },
        { '@type': 'ListItem', position: 2, name: 'Base64 编解码', url: `${SITE_URL}/base64` },
        { '@type': 'ListItem', position: 3, name: 'URL 编解码', url: `${SITE_URL}/urlcodec` },
        { '@type': 'ListItem', position: 4, name: '哈希计算', url: `${SITE_URL}/md5` },
        { '@type': 'ListItem', position: 5, name: 'JSON 格式化', url: `${SITE_URL}/jsonformatter` },
        { '@type': 'ListItem', position: 6, name: '时间戳转换', url: `${SITE_URL}/timestamp` },
      ],
    },
  ],
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="container mx-auto px-4 py-10 md:py-14">
        <header className="text-center mb-8 md:mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            在线工具合集
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            {SITE_DESCRIPTION}
          </p>
        </header>

        <HomeTools />

        <section className="mt-14 md:mt-20 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">即开即用</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                无需注册登录，打开网页即可使用，支持响应式布局
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-3">🔒</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">隐私安全</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                所有数据在浏览器本地处理，文件与文本不会上传到服务器
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-3">🆓</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">完全免费</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                全部工具免费开放使用，持续更新更多实用功能
              </p>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  )
}
