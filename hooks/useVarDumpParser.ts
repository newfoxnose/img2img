'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatVarDump, ParsedValue } from '@/lib/var-dump/varDumpParser'

/**
 * var_dump解析器Hook
 * 提供防抖和异步解析功能，避免页面失去响应
 */
export function useVarDumpParser() {
  const [parsedData, setParsedData] = useState<ParsedValue[]>([])
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDebouncing, setIsDebouncing] = useState(false)
  
  // 使用ref来存储最新的输入，避免闭包问题
  const inputRef = useRef<string>('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 防抖解析函数
   */
  const debouncedParse = useCallback((input: string) => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 如果输入为空，立即清空结果
    if (!input.trim()) {
      setParsedData([])
      setError('')
      setIsProcessing(false)
      setIsDebouncing(false)
      return
    }

    // 设置防抖状态
    setIsDebouncing(true)
    inputRef.current = input

    // 设置防抖定时器
    timeoutRef.current = setTimeout(async () => {
      try {
        setIsDebouncing(false)
        setIsProcessing(true)
        setError('')

        // 异步解析
        const result = await formatVarDump(inputRef.current)
        setParsedData(result)
      } catch (err) {
        setError('解析失败：输入内容不是有效的var_dump输出格式')
        setParsedData([])
      } finally {
        setIsProcessing(false)
      }
    }, 300) // 300ms防抖延迟
  }, [])

  /**
   * 立即解析函数（用于手动触发）
   */
  const parseImmediately = useCallback(async (input: string) => {
    // 清除防抖定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!input.trim()) {
      setParsedData([])
      setError('')
      setIsProcessing(false)
      setIsDebouncing(false)
      return
    }

    try {
      setIsDebouncing(false)
      setIsProcessing(true)
      setError('')

      const result = await formatVarDump(input)
      setParsedData(result)
    } catch (err) {
      setError('解析失败：输入内容不是有效的var_dump输出格式')
      setParsedData([])
    } finally {
      setIsProcessing(false)
    }
  }, [])

  /**
   * 清空结果
   */
  const clearResults = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setParsedData([])
    setError('')
    setIsProcessing(false)
    setIsDebouncing(false)
  }, [])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    parsedData,
    error,
    isProcessing,
    isDebouncing,
    debouncedParse,
    parseImmediately,
    clearResults
  }
}
