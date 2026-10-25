import React from 'react'
import Link from 'next/link'

/**
 * 工具导航列表
 */
const toolLinks = [
  { href: '/image', label: '图片处理' },
  { href: '/ip', label: '本机 IP 查询' },
  { href: '/timestamp', label: '时间戳转换' },
  { href: '/md5', label: 'MD5 计算' },
  { href: '/jsonformatter', label: 'JSON 格式化' },
  { href: '/vardump', label: 'var_dump 格式化' },
]

/**
 * 全站统一页脚组件（纯中文）
 */
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-responsive py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* 关于本站 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">关于本站</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              在线工具合集，汇集图片处理与开发者常用小工具。所有处理均在浏览器本地完成，数据不会上传服务器，打开即用。
            </p>
          </div>

          {/* 工具导航 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">工具导航</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              {toolLinks.map((tool) => (
                <li key={tool.href}>
                  <Link
                    href={tool.href}
                    className="hover:text-white transition-colors"
                  >
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 功能特性 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">功能特性</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>图片格式转换与证件照制作</li>
              <li>本机 IP 与时间戳查询</li>
              <li>MD5 哈希与 JSON 格式化</li>
              <li>PHP var_dump 输出美化</li>
              <li>响应式设计，移动端适配</li>
              <li>完全免费无需注册</li>
            </ul>
          </div>

          {/* 技术栈 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">技术栈</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>Next.js 14</li>
              <li>React 18</li>
              <li>TypeScript</li>
              <li>Tailwind CSS</li>
              <li>纯客户端本地处理</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2024 在线工具合集. 保留所有权利。</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                隐私政策
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                使用条款
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                联系我们
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
