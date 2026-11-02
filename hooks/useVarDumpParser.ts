'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ParsedValue } from '@/lib/var-dump/varDumpParser'
import { parseInput } from '@/lib/var-dump/formatConverter'
import type { InputFormat } from '@/lib/var-dump/formatConverter'

const DEFAULT_FORMAT: InputFormat = 'auto'

/**
 * 调试输出解析器 Hook
 * 支持 var_dump / print_r / JSON / Laravel dump，提供防抖和异步解析能力
 */
export function useVarDumpParser() {
  const [parsedData, setParsedData] = useState<ParsedValue[]>([])
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDebouncing, setIsDebouncing] = useState(false)
  const [format, setFormat] = useState<InputFormat>(DEFAULT_FORMAT)

  // 使用 ref 存储最新的输入与格式，避免闭包问题
  const inputRef = useRef<string>('')
  const formatRef = useRef<InputFormat>(DEFAULT_FORMAT)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  /**
   * 执行解析（带请求编号，避免旧结果覆盖新结果）
   */
  const runParse = useCallback(async (input: string, nextFormat: InputFormat) => {
    const requestId = ++requestIdRef.current

    setIsDebouncing(false)
    setIsProcessing(true)
    setError('')

    try {
      const result = await parseInput(input, nextFormat)
      if (requestId !== requestIdRef.current) return
      setParsedData(result)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setParsedData([])
      setError(
        err instanceof Error
          ? err.message
          : '暂无法识别该格式，请粘贴 var_dump/print_r/json_encode 输出'
      )
    } finally {
      if (requestId === requestIdRef.current) {
        setIsProcessing(false)
      }
    }
  }, [])

  /**
   * 防抖解析函数
   */
  const debouncedParse = useCallback(
    (input: string, nextFormat?: InputFormat) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (nextFormat && nextFormat !== formatRef.current) {
        formatRef.current = nextFormat
        setFormat(nextFormat)
      }

      inputRef.current = input

      // 输入为空时立即清空结果
      if (!input.trim()) {
        requestIdRef.current++
        setParsedData([])
        setError('')
        setIsProcessing(false)
        setIsDebouncing(false)
        return
      }

      setIsDebouncing(true)

      timeoutRef.current = setTimeout(() => {
        void runParse(inputRef.current, formatRef.current)
      }, 300) // 300ms 防抖延迟
    },
    [runParse]
  )

  /**
   * 切换输入格式，并用当前输入立即重新解析
   */
  const changeFormat = useCallback(
    (nextFormat: InputFormat) => {
      if (nextFormat === formatRef.current) return

      formatRef.current = nextFormat
      setFormat(nextFormat)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (!inputRef.current.trim()) return
      void runParse(inputRef.current, nextFormat)
    },
    [runParse]
  )

  /**
   * 立即解析函数（用于手动触发）
   */
  const parseImmediately = useCallback(
    async (input: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      inputRef.current = input

      if (!input.trim()) {
        requestIdRef.current++
        setParsedData([])
        setError('')
        setIsProcessing(false)
        setIsDebouncing(false)
        return
      }

      await runParse(input, formatRef.current)
    },
    [runParse]
  )

  /**
   * 清空结果
   */
  const clearResults = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    requestIdRef.current++
    inputRef.current = ''
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
    format,
    debouncedParse,
    changeFormat,
    parseImmediately,
    clearResults
  }
}
