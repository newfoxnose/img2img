'use client'

import { useState } from 'react'
import Link from 'next/link'
import ImageConverter from '@/components/ImageConverter'
import IDPhotoConverter from '@/components/IDPhotoConverter'
import IDPhotoLayout from '@/components/IDPhotoLayout'
import ImageSplitter from '@/components/ImageSplitter'
import Footer from '@/components/shared/Footer'

type TabType = 'convert' | 'idphoto' | 'layout' | 'split'

export default function ImageToolsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('convert')

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="container mx-auto px-4 py-3">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            工具合集
          </Link>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* 页面标题和描述 */}
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            图片处理工具
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            支持图片格式转换、质量与尺寸压缩、水印添加、证件照处理和图片分割，单个文件处理或批量处理，转换后自动打包下载
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
            <button
              onClick={() => setActiveTab('layout')}
              className={`px-6 py-2 rounded-md transition-colors font-medium ${
                activeTab === 'layout'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              证件照排版
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`px-6 py-2 rounded-md transition-colors font-medium ${
                activeTab === 'split'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              图片分割
            </button>
          </div>
        </div>

        {/* 主要转换组件 */}
        {activeTab === 'convert' ? (
          <ImageConverter />
        ) : activeTab === 'idphoto' ? (
          <IDPhotoConverter />
        ) : activeTab === 'layout' ? (
          <IDPhotoLayout />
        ) : (
          <ImageSplitter />
        )}

        {/* 功能说明区域 */}
        <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            功能特点
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="text-3xl mb-3">📉</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                图片压缩
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                调整输出质量与最大宽高，或填写目标体积，自动迭代压缩 JPG/WebP，等比缩放且不放大
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">🖋️</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                水印
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                支持右下、居中、左下和平铺位置，可调不透明度与字号，文字带描边阴影，随转换一并生效
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">📷</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                证件照处理
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                支持 1寸、大2寸等标准尺寸，可裁剪头像范围，调整亮度和对比度，AI 智能抠图换背景（基于 IMG.LY 背景去除引擎）
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">📐</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                证件照排版
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                将 1寸 / 2寸 照片拖放到 5寸相纸（102×152mm）上，自动计算最佳方向并铺满整版，照片之间留间隙，导出 300dpi 打印图片
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                批量处理
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                一次上传多个文件，批量转换后自动打包成 ZIP 文件下载，同名文件自动添加序号避免冲突
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">🔒</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                隐私与 EXIF
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                所有转换在浏览器本地完成，图片不会上传到服务器；Canvas 重新编码会移除 EXIF 等元数据，隐私更好
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
                <li>在转换参数面板中选择输出格式（JPG、PNG 或 WebP）</li>
                <li>
                  按需调整输出质量（10%–100%，JPG/WebP 生效；PNG 为无损格式，质量参数不可用）
                </li>
                <li>
                  填写最大宽度/最大高度（px，留空或 0 表示不缩放），系统会等比缩放且不会放大原图
                </li>
                <li>
                  可选填写目标体积（KB，仅 JPG/WebP 生效），系统会自动迭代降低质量逼近目标；若最低质量仍超出会标注“未达到目标体积”
                </li>
                <li>
                  可选添加水印：填写文字后选择位置（右下/居中/左下/平铺），调整不透明度与字号；留空则不添加
                </li>
                <li>点击上传区域或拖拽图片文件到指定区域，支持多选</li>
                <li>支持上传 JPG、JFIF、WebP、PNG、GIF、BMP、TIFF、SVG、ICO 等格式的图片文件</li>
                <li>修改任意参数后会自动重新转换所有已上传文件，可查看每个文件的原大小、输出大小和压缩率</li>
                <li>批量转换完成后点击"打包下载"按钮获取 ZIP 文件；同名文件会自动添加序号</li>
                <li>
                  所有转换操作在浏览器本地完成，保护您的隐私；Canvas 重新编码会移除 EXIF/元数据，证件照工具会写入 300 DPI
                </li>
              </ol>
            </div>
          </section>
        ) : activeTab === 'idphoto' ? (
          <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              证件照处理使用说明
            </h2>
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md">
              <ol className="list-decimal list-inside space-y-4 text-gray-700 dark:text-gray-300">
                <li>选择证件照尺寸（1寸 宽295×高413px 或 大2寸 宽413×高626px）</li>
                <li>点击上传区域或拖拽照片文件到指定区域，支持批量上传</li>
                <li>点击"编辑"按钮打开编辑器，可以调整裁剪区域（拖动移动、拖动四角缩放）</li>
                <li>使用滑块调整亮度、对比度和饱和度，实时预览效果</li>
                <li>
                  选择背景颜色（白色、红色、宝蓝色、天蓝色），系统会自动使用 IMG.LY AI 引擎抠图并替换背景
                </li>
                <li>点击"批量处理"处理所有照片，或单独处理每个文件</li>
                <li>处理完成后可以单独下载或批量打包下载</li>
                <li>所有处理操作在浏览器本地完成，保护您的隐私</li>
              </ol>
            </div>
          </section>
        ) : activeTab === 'layout' ? (
          <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              证件照排版使用说明
            </h2>
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md">
              <ol className="list-decimal list-inside space-y-4 text-gray-700 dark:text-gray-300">
                <li>
                  上传一张或多张 1寸 / 2寸 证件照，在左侧列表为每张选择正确的尺寸（1寸 25×35mm / 2寸 35×53mm）
                </li>
                <li>
                  选择相纸规格（默认 5寸 102×152mm）和照片间隙（0–5mm）；相纸边缘不留边距，照片贴边放置
                </li>
                <li>
                  勾选"允许旋转"后，系统会自动评估每张照片是否旋转 90° 能容纳更多数量
                </li>
                <li>
                  点击「🎯 自动排版」：单张照片会自动复制铺满整张相纸（1寸 ≈ 12 张 / 2寸 ≈ 4 张）；多张照片会按顺序逐行排下
                </li>
                <li>
                  自动排版后，可直接在相纸预览画布上<strong>拖动照片</strong>到任意位置微调
                </li>
                <li>
                  点击「下载 JPG」或「下载 PNG」导出 300dpi 原尺寸图片（5寸相纸 ≈ 1205×1795px），直接拿去打印
                </li>
                <li>所有排版和导出操作在浏览器本地完成，保护您的隐私</li>
              </ol>
            </div>
          </section>
        ) : (
          <section className="mt-12 md:mt-16 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
              图片分割使用说明
            </h2>
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg shadow-md">
              <ol className="list-decimal list-inside space-y-4 text-gray-700 dark:text-gray-300">
                <li>选择输出格式（JPG、PNG 或 WebP）</li>
                <li>点击上传区域或拖拽图片文件到指定区域，支持批量上传</li>
                <li>
                  每张图片上传后会显示<strong>旋转滑块</strong>（0°–360°，可拖动或点击 0°/90°/180°/270° 快捷按钮），原图会先按所选角度旋转
                </li>
                <li>
                  旋转后的图片上覆盖一个<strong>蓝色裁切框</strong>，可拖动四条边线（上、下、左、右）调整裁切区域的大小与位置
                </li>
                <li>
                  调整旋转角度或裁切框后，系统会自动重新分割（固定沿水平方向裁切左右、分割为多张宽高比为 <strong>3:4</strong> 的竖版照片）
                </li>
                <li>
                  分割时裁切区域左右两侧会均分裁切多余部分，使结果刚好为整数张
                </li>
                <li>可点击单张下载或"全部下载"保存某张原图的所有结果</li>
                <li>也可点击"打包下载"将所有分割结果打包为 ZIP 文件一次性下载</li>
                <li>所有处理操作在浏览器本地完成，保护您的隐私</li>
              </ol>
            </div>
          </section>
        )}
      </div>

      {/* 页脚 */}
      <Footer />
    </main>
  )
}

