import React from 'react'
import Link from 'next/link'
import { tools } from '@/lib/tools'

/**
 * 全站统一页脚组件，工具导航由 lib/tools.ts 自动生成
 */
export default function Footer() {
  const popular = tools.filter((tool) => tool.isNew).slice(0, 8)
  const rest = tools.filter((tool) => !popular.includes(tool))

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-responsive py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 关于本站 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">关于本站</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              在线工具合集，汇集图片处理、编码转换与开发者常用小工具。所有处理均在浏览器本地完成，数据不会上传服务器，打开即用。
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link href="/about" className="text-gray-400 hover:text-white transition-colors">
                关于我们
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                隐私政策
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                使用条款
              </Link>
            </div>
          </div>

          {/* 最新工具 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">最新工具</h2>
            <ul className="text-gray-300 text-sm space-y-2">
              {popular.map((tool) => (
                <li key={tool.href}>
                  <Link href={tool.href} className="hover:text-white transition-colors">
                    {tool.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 全部工具 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">全部工具</h2>
            <ul className="text-gray-300 text-sm space-y-2 grid grid-cols-1 xl:grid-cols-2 gap-x-4">
              {rest.map((tool) => (
                <li key={tool.href}>
                  <Link href={tool.href} className="hover:text-white transition-colors">
                    {tool.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 功能特性 */}
          <div>
            <h2 className="text-lg font-semibold mb-4">功能特性</h2>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>图片转换、压缩与证件照</li>
              <li>编码、哈希与 JSON 处理</li>
              <li>时间日期与网络查询</li>
              <li>响应式设计，移动端适配</li>
              <li>完全免费无需注册</li>
              <li>Next.js 14 · 纯客户端处理</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2026 在线工具合集. 保留所有权利。</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                隐私政策
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                使用条款
              </Link>
              <Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors">
                联系我们
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
