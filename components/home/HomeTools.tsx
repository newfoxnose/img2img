'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { searchTools, TOOL_CATEGORIES, tools, type ToolCategory } from '@/lib/tools'
import { useRecentTools } from '@/hooks/useRecentTools'

/**
 * 首页工具搜索与列表
 */
export default function HomeTools() {
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<'全部' | ToolCategory>('全部')
  const inputRef = useRef<HTMLInputElement>(null)
  const { recentTools, record } = useRecentTools()

  // Ctrl/Cmd + K 聚焦搜索框
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const filteredTools = useMemo(() => {
    const byKeyword = searchTools(keyword)
    if (category === '全部') return byKeyword
    return byKeyword.filter((tool) => tool.category === category)
  }, [keyword, category])

  return (
    <div>
      {/* 搜索与筛选 */}
      <div className="max-w-5xl mx-auto">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索工具，例如 JSON、Base64、图片压缩"
            aria-label="搜索工具"
            className="w-full pl-12 pr-24 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hidden sm:inline">
            Ctrl/⌘ + K
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['全部', ...TOOL_CATEGORIES] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                category === item
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* 最近使用 */}
      {recentTools.length > 0 && !keyword && category === '全部' && (
        <section className="max-w-5xl mx-auto mt-8">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">最近使用</h2>
          <div className="flex flex-wrap gap-2">
            {recentTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => record(tool.href)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-white text-gray-700 shadow-sm hover:text-blue-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:text-blue-400"
              >
                <span aria-hidden="true">{tool.icon}</span>
                {tool.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 工具卡片 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto mt-8">
        {filteredTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            onClick={() => record(tool.href)}
            className="group relative bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 flex flex-col"
          >
            {tool.isNew && (
              <span className="absolute top-4 right-4 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                NEW
              </span>
            )}
            <div className="flex items-center mb-3">
              <div className="w-11 h-11 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-gray-700 text-xl font-mono font-bold text-blue-600 dark:text-blue-400 mr-3 select-none">
                {tool.icon}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tool.title}
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">{tool.category}</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed flex-1">
              {tool.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {tool.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </section>

      {filteredTools.length === 0 && (
        <div className="max-w-5xl mx-auto mt-16 text-center text-gray-500 dark:text-gray-400">
          <p className="text-2xl mb-2">没有找到匹配的工具</p>
          <p className="text-sm">试试其他关键词，或清空筛选条件</p>
          <button
            type="button"
            onClick={() => {
              setKeyword('')
              setCategory('全部')
            }}
            className="mt-4 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            清空搜索
          </button>
        </div>
      )}

      <p className="max-w-5xl mx-auto mt-6 text-center text-xs text-gray-400 dark:text-gray-500">
        共收录 {tools.length} 个工具，持续更新
      </p>
    </div>
  )
}
