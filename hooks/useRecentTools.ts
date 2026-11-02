'use client'

import { useCallback, useEffect, useState } from 'react'
import { tools, type ToolMeta } from '@/lib/tools'

const STORAGE_KEY = 'recent-tools'
const MAX_RECENT = 6

/**
 * 最近使用工具
 * 记录在首页点击的工具；直接输入 URL 访问不会记录
 */
export function useRecentTools() {
  const [recentHrefs, setRecentHrefs] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setRecentHrefs(parsed.filter((item) => typeof item === 'string'))
        }
      }
    } catch {
      // 忽略损坏的本地数据
    }
  }, [])

  const record = useCallback((href: string) => {
    setRecentHrefs((prev) => {
      const next = [href, ...prev.filter((item) => item !== href)].slice(0, MAX_RECENT)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // 隐私模式下可能无法写入，忽略
      }
      return next
    })
  }, [])

  const recentTools = recentHrefs
    .map((href) => tools.find((tool) => tool.href === href))
    .filter((tool): tool is ToolMeta => Boolean(tool))

  return { recentTools, record }
}
