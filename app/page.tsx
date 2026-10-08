import Link from 'next/link'
import Footer from '@/components/shared/Footer'

interface ToolItem {
  href: string
  icon: string
  title: string
  description: string
  tags: string[]
}

const tools: ToolItem[] = [
  {
    href: '/image',
    icon: '🖼️',
    title: '图片处理',
    description:
      '图片格式转换、证件照制作与图片分割，支持批量处理、ZIP 打包下载和 AI 智能抠图换背景。',
    tags: ['格式转换', '证件照', '图片分割'],
  },
  {
    href: '/jsonformatter',
    icon: '{ }',
    title: 'JSON 格式化',
    description:
      '在线 JSON 格式化、压缩与实时校验，支持语法高亮、树形视图，帮助开发者快速阅读和编辑 JSON 数据。',
    tags: ['格式化', '校验', '语法高亮'],
  },
  {
    href: '/vardump',
    icon: '🐘',
    title: 'var_dump 格式化',
    description:
      'PHP var_dump 输出美化工具，支持语法高亮、折叠展开、类型识别以及数组与对象的结构化解析。',
    tags: ['PHP', '调试', '数组解析'],
  },
  {
    href: '/gbk2gb2312',
    icon: '🔤',
    title: 'GBK 转 GB2312',
    description:
      '智能检测 GB2312 之外的 GBK 扩展字，按发音与字形优先级自动替换为最接近的 GB2312 字符，输出兼容文本。',
    tags: ['编码转换', '相似字替换', '中文处理'],
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-12 md:py-20">
        {/* 页面标题和描述 */}
        <header className="text-center mb-12 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            在线工具合集
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            汇集图片处理与开发者常用小工具，即开即用，所有处理均在浏览器本地完成
          </p>
        </header>

        {/* 工具卡片 */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group bg-white dark:bg-gray-800 rounded-xl p-6 md:p-8 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 flex flex-col"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-gray-700 text-2xl font-mono font-bold text-blue-600 dark:text-blue-400 mr-4 select-none">
                  {tool.icon}
                </div>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tool.title}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base leading-relaxed flex-1">
                {tool.description}
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {tool.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-5 text-sm font-medium text-blue-600 dark:text-blue-400 inline-flex items-center">
                立即使用
                <svg
                  className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </section>

        {/* 特点说明 */}
        <section className="mt-16 md:mt-20 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                即开即用
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                无需注册登录，打开网页即可使用，支持响应式布局
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                隐私安全
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                所有数据在浏览器本地处理，文件与文本不会上传到服务器
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center">
              <div className="text-3xl mb-3">🆓</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                完全免费
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                全部工具免费开放使用，持续更新更多实用功能
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* 页脚 */}
      <Footer />
    </main>
  )
}
