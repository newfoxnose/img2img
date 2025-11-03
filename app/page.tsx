'use client'

import { useState, useRef } from 'react'
import ImageConverter from '@/components/ImageConverter'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* 页面标题和描述 */}
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            图片格式转换工具
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            支持多种图片格式转换（JPG、PNG、WebP、GIF、BMP、TIFF、SVG、ICO等），单个文件转换或批量转换，转换后自动打包下载
          </p>
        </header>

        {/* 主要转换组件 */}
        <ImageConverter />

        {/* 功能说明区域 */}
        <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            功能特点
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">🔄</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                格式转换
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                支持 JPG、PNG、WebP、GIF、BMP、TIFF、SVG、ICO 等多种格式，可转换为 JPG、PNG 或 WebP 格式
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                批量处理
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                一次上传多个文件，批量转换后自动打包成 ZIP 文件下载
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                隐私安全
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                所有转换在浏览器本地完成，图片不会上传到服务器
              </p>
            </div>
          </div>
        </section>

        {/* 使用说明 */}
        <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            使用说明
          </h2>
          <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md">
            <ol className="list-decimal list-inside space-y-4 text-gray-700 dark:text-gray-300">
              <li>选择输出格式（JPG、PNG 或 WebP）</li>
              <li>点击上传区域或拖拽图片文件到指定区域</li>
              <li>支持上传 JPG、JFIF、WebP、PNG、GIF、BMP、TIFF、SVG、ICO 等格式的图片文件</li>
              <li>单个文件转换：上传后自动转换，点击下载按钮保存</li>
              <li>批量转换：上传多个文件，转换完成后点击"打包下载"按钮</li>
              <li>所有转换操作在浏览器本地完成，保护您的隐私</li>
            </ol>
          </div>
        </section>
      </div>

      {/* 页脚 */}
      <footer className="mt-16 py-8 text-center text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        <p>© 2024 图片格式转换工具 - 免费在线图片格式转换服务</p>
      </footer>
    </main>
  )
}

