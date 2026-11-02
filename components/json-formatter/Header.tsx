'use client'

import React from 'react'

const features = ['语法高亮', '格式化/压缩', '键名排序', 'YAML/XML/CSV', 'JSONPath', '本地处理']

/**
 * 页面头部组件
 * 包含标题、描述和导航
 */
export default function Header() {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="container-responsive py-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            JSON 格式化工具
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            专业的JSON格式化工具，让您的JSON数据更易读
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {features.map((feature: string, index: number) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
