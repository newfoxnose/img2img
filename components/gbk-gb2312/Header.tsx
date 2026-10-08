'use client'

import React from 'react'

const features = ['智能匹配', '相似字符替换', '实时转换', '响应式设计', '完全免费']

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
            GBK到GB2312转换工具
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            将GBK编码中不在GB2312字符集内的字符替换为GB2312中相似的字符
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
