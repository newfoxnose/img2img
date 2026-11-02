'use client'

import React from 'react'

const features = ['var_dump', 'print_r', 'json_encode', 'Laravel dump', '语法高亮', '折叠展开']

/**
 * 页面头部组件
 * 包含标题、描述和导航
 */
export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="container-responsive py-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2 dark:text-white">
            PHP 调试输出格式化工具
          </h1>
          <p className="text-lg text-gray-600 mb-4 dark:text-gray-300">
            支持 var_dump、print_r、json_encode 与 Laravel dump()/dd() 输出的结构化解析，自动识别格式
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500 dark:text-gray-300">
            {features.map((feature: string, index: number) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 rounded-full dark:bg-gray-700 dark:text-gray-300"
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
