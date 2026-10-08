'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * JSON格式化结果接口
 */
export interface JsonFormatResult {
  formatted: string
  minified: string
  isValid: boolean
  error?: string
}

/**
 * JSON格式化Hook
 * 提供防抖和异步格式化功能，避免页面失去响应
 */
export function useJsonFormatter() {
  const [result, setResult] = useState<JsonFormatResult | null>(null)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDebouncing, setIsDebouncing] = useState(false)
  
  // 使用ref来存储最新的输入，避免闭包问题
  const inputRef = useRef<string>('')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * 格式化JSON
   */
  const formatJson = useCallback((input: string): JsonFormatResult => {
    // 如果输入为空，返回空结果
    if (!input.trim()) {
      return {
        formatted: '',
        minified: '',
        isValid: false
      }
    }

    try {
      // 尝试解析JSON
      const parsed = JSON.parse(input.trim())
      
      // 格式化JSON（2空格缩进）
      const formatted = JSON.stringify(parsed, null, 2)
      
      // 压缩JSON（无空格）
      const minified = JSON.stringify(parsed)
      
      return {
        formatted,
        minified,
        isValid: true
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '无效的JSON格式'
      return {
        formatted: '',
        minified: '',
        isValid: false,
        error: errorMessage
      }
    }
  }, [])

  /**
   * 防抖格式化函数
   */
  const debouncedFormat = useCallback((input: string) => {
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // 如果输入为空，立即清空结果
    if (!input.trim()) {
      setResult(null)
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

        // 异步格式化
        const formatResult = formatJson(inputRef.current)
        
        if (formatResult.isValid) {
          setResult(formatResult)
          setError('')
        } else {
          setError(formatResult.error || '无效的JSON格式')
          setResult(null)
        }
      } catch (err) {
        setError('格式化失败：输入内容不是有效的JSON格式')
        setResult(null)
      } finally {
        setIsProcessing(false)
      }
    }, 300) // 300ms防抖延迟
  }, [formatJson])

  /**
   * 立即格式化函数（用于手动触发）
   */
  const formatImmediately = useCallback(async (input: string) => {
    // 清除防抖定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!input.trim()) {
      setResult(null)
      setError('')
      setIsProcessing(false)
      setIsDebouncing(false)
      return
    }

    try {
      setIsDebouncing(false)
      setIsProcessing(true)
      setError('')

      const formatResult = formatJson(input)
      
      if (formatResult.isValid) {
        setResult(formatResult)
        setError('')
      } else {
        setError(formatResult.error || '无效的JSON格式')
        setResult(null)
      }
    } catch (err) {
      setError('格式化失败：输入内容不是有效的JSON格式')
      setResult(null)
    } finally {
      setIsProcessing(false)
    }
  }, [formatJson])

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
    isProcessing,
    isDebouncing,
    debouncedFormat,
    formatImmediately,
    clearResults
  }
}

