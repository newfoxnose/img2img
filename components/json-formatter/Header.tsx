'use client'

import React from 'react'

const features = ['语法高亮', '格式化/压缩', '实时验证', '响应式设计', '完全免费']

/**
 * 页面头部组件
 * 包含标题、描述和导航
 */
export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container-responsive py-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            JSON 格式化工具
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            专业的JSON格式化工具，让您的JSON数据更易读
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
            {features.map((feature: string, index: number) => (
              <span key={index} className="px-3 py-1 bg-gray-100 rounded-full">
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
