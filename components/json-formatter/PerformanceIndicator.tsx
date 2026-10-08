'use client'

import React from 'react'

interface PerformanceIndicatorProps {
  isProcessing: boolean
  isDebouncing: boolean
  dataLength: number
  inputLength: number
}

/**
 * 性能指示器组件
 * 显示解析状态和性能信息
 */
export default function PerformanceIndicator({
  isProcessing,
  isDebouncing,
  dataLength,
  inputLength
}: PerformanceIndicatorProps) {

  if (!isProcessing && !isDebouncing) {
    return null
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-blue-800 font-medium">
            {isDebouncing ? '等待输入完成...' : '正在解析数据...'}
          </span>
        </div>

        <div className="text-sm text-blue-600">
          <span className="mr-4">输入: {inputLength} 字符</span>
          {dataLength > 0 && <span>已解析: {dataLength} 项</span>}
        </div>
      </div>

      {isProcessing && (
        <div className="mt-2">
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            正在处理复杂数据结构，请稍候...
          </p>
        </div>
      )}
    </div>
  )
}
