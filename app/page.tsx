'use client'

import { useState } from 'react'
import ImageConverter from '@/components/ImageConverter'
import IDPhotoConverter from '@/components/IDPhotoConverter'

type TabType = 'convert' | 'idphoto'

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('convert')

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* 页面标题和描述 */}
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            图片处理工具
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            支持图片格式转换和证件照处理，单个文件处理或批量处理，转换后自动打包下载
          </p>
        </header>

        {/* 标签页切换 */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md">
            <button
              onClick={() => setActiveTab('convert')}
              className={`px-6 py-2 rounded-md transition-colors font-medium ${
                activeTab === 'convert'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              格式转换
            </button>
            <button
              onClick={() => setActiveTab('idphoto')}
              className={`px-6 py-2 rounded-md transition-colors font-medium ${
                activeTab === 'idphoto'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              证件照处理
            </button>
          </div>
        </div>

        {/* 主要转换组件 */}
        {activeTab === 'convert' ? <ImageConverter /> : <IDPhotoConverter />}

        {/* 功能说明区域 */}
        <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            功能特点
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <div className="text-3xl mb-3">📷</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                证件照处理
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                支持 1寸、大2寸等标准尺寸，可裁剪头像范围，调整亮度和对比度
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
        {activeTab === 'convert' ? (
          <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              格式转换使用说明
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
        ) : (
          <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              证件照处理使用说明
            </h2>
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md">
              <ol className="list-decimal list-inside space-y-4 text-gray-700 dark:text-gray-300">
                <li>选择证件照尺寸（1寸 宽295×高413px 或 大2寸 宽413×高626px）</li>
                <li>点击上传区域或拖拽照片文件到指定区域，支持批量上传</li>
                <li>点击"编辑"按钮打开编辑器，可以调整裁剪区域（拖动移动、拖动四角缩放）</li>
                <li>使用滑块调整亮度和对比度，实时预览效果</li>
                <li>点击"批量处理"处理所有照片，或单独处理每个文件</li>
                <li>处理完成后可以单独下载或批量打包下载</li>
                <li>所有处理操作在浏览器本地完成，保护您的隐私</li>
              </ol>
            </div>
          </section>
        )}
      </div>

      {/* 页脚 */}
      <footer className="mt-16 py-8 text-center text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        <p>© 2024 图片格式转换工具 - 免费在线图片格式转换服务</p>
      </footer>
    </main>
  )
}

