'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  locateJsonError,
  sortJsonKeys,
  type JsonErrorLocation,
  type JsonValue,
} from '@/lib/json-tools'

/**
 * JSON格式化结果接口
 */
export interface JsonFormatResult {
  formatted: string
  minified: string
  isValid: boolean
  error?: string
  errorLocation?: JsonErrorLocation | null
}

/**
 * JSON格式化Hook
 * 提供防抖和异步格式化功能，避免页面失去响应
 * 支持递归排序键名，并在解析失败时定位错误行列
 */
export function useJsonFormatter() {
  const [result, setResult] = useState<JsonFormatResult | null>(null)
  const [error, setError] = useState<string>('')
  const [errorLocation, setErrorLocation] = useState<JsonErrorLocation | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDebouncing, setIsDebouncing] = useState(false)
  const [sortKeys, setSortKeysState] = useState(false)

  // 使用ref来存储最新的输入，避免闭包问题
  const inputRef = useRef<string>('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sortKeysRef = useRef(false)

  /**
   * 格式化JSON
   */
  const formatJson = useCallback(
    (input: string, shouldSortKeys: boolean): JsonFormatResult => {
      // 如果输入为空，返回空结果
      if (!input.trim()) {
        return {
          formatted: '',
          minified: '',
          isValid: false,
        }
      }

      const source = input.trim()

      try {
        // 尝试解析JSON
        const parsed = JSON.parse(source) as JsonValue
        const prepared = shouldSortKeys ? sortJsonKeys(parsed) : parsed

        // 格式化JSON（2空格缩进）
        const formatted = JSON.stringify(prepared, null, 2)

        // 压缩JSON（无空格）
        const minified = JSON.stringify(prepared)

        return {
          formatted,
          minified,
          isValid: true,
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '无效的JSON格式'
        return {
          formatted: '',
          minified: '',
          isValid: false,
          error: errorMessage,
          errorLocation: locateJsonError(errorMessage, source),
        }
      }
    },
    []
  )

  /**
   * 防抖格式化函数
   */
  const debouncedFormat = useCallback(
    (input: string) => {
      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // 记录最新输入，供排序开关重算
      inputRef.current = input

      // 如果输入为空，立即清空结果
      if (!input.trim()) {
        setResult(null)
        setError('')
        setErrorLocation(null)
        setIsProcessing(false)
        setIsDebouncing(false)
        return
      }

      // 设置防抖状态
      setIsDebouncing(true)

      // 设置防抖定时器
      timeoutRef.current = setTimeout(() => {
        try {
          setIsDebouncing(false)
          setIsProcessing(true)
          setError('')
          setErrorLocation(null)

          // 异步格式化
          const formatResult = formatJson(inputRef.current, sortKeysRef.current)

          if (formatResult.isValid) {
            setResult(formatResult)
            setError('')
            setErrorLocation(null)
          } else {
            setError(formatResult.error || '无效的JSON格式')
            setErrorLocation(formatResult.errorLocation ?? null)
            setResult(null)
          }
        } catch {
          setError('格式化失败：输入内容不是有效的JSON格式')
          setErrorLocation(null)
          setResult(null)
        } finally {
          setIsProcessing(false)
        }
      }, 300) // 300ms防抖延迟
    },
    [formatJson]
  )

  /**
   * 立即格式化函数（用于手动触发）
   */
  const formatImmediately = useCallback(
    (input: string) => {
      inputRef.current = input

      // 清除防抖定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (!input.trim()) {
        setResult(null)
        setError('')
        setErrorLocation(null)
        setIsProcessing(false)
        setIsDebouncing(false)
        return
      }

      try {
        setIsDebouncing(false)
        setIsProcessing(true)
        setError('')
        setErrorLocation(null)

        const formatResult = formatJson(input, sortKeysRef.current)

        if (formatResult.isValid) {
          setResult(formatResult)
          setError('')
          setErrorLocation(null)
        } else {
          setError(formatResult.error || '无效的JSON格式')
          setErrorLocation(formatResult.errorLocation ?? null)
          setResult(null)
        }
      } catch {
        setError('格式化失败：输入内容不是有效的JSON格式')
        setErrorLocation(null)
        setResult(null)
      } finally {
        setIsProcessing(false)
      }
    },
    [formatJson]
  )

  /**
   * 切换键名排序，并使用当前输入立即重算
   */
  const setSortKeys = useCallback(
    (next: boolean) => {
      sortKeysRef.current = next
      setSortKeysState(next)
      formatImmediately(inputRef.current)
    },
    [formatImmediately]
  )

  /**
   * 清空结果
   */
  const clearResults = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setResult(null)
    setError('')
    setErrorLocation(null)
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
    result,
    error,
    errorLocation,
    isProcessing,
    isDebouncing,
    sortKeys,
    setSortKeys,
    debouncedFormat,
    formatImmediately,
    clearResults,
  }
}
