'use client'

import React, { useState, useCallback } from 'react'
import Header from '@/components/json-formatter/Header'
import Footer from '@/components/shared/Footer'
import CodeInput from '@/components/json-formatter/CodeInput'
import JsonFormatter from '@/components/json-formatter/JsonFormatter'
import PerformanceIndicator from '@/components/json-formatter/PerformanceIndicator'
import { useJsonFormatter } from '@/hooks/useJsonFormatter'

const instructionSteps = [
  '在输入框中粘贴或输入JSON字符串',
  '工具会自动验证并格式化JSON',
  '支持格式化（美化）和压缩两种显示模式',
  '点击复制按钮可以快速复制格式化后的JSON'
]

/**
 * JSON 格式化工具页面
 * 包含输入区域和格式化显示区域
 */
export default function JsonFormatterPage() {
  const [inputLength, setInputLength] = useState(0)

  const {
    result,
    error,
    isProcessing,
    isDebouncing,
    debouncedFormat,
    formatImmediately,
    clearResults
  } = useJsonFormatter()

  /**
   * 处理输入变化
   * 使用 useCallback 确保函数引用稳定，避免子组件不必要的重新渲染
   */
  const handleInputChange = useCallback((input: string) => {
    setInputLength(input.length)
    debouncedFormat(input)
  }, [debouncedFormat])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-responsive py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 输入区域 */}
          <section className="space-y-6" aria-label="输入区域">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                输入JSON
              </h2>
              <CodeInput
                onInputChange={handleInputChange}
                // 防抖阶段仍允许继续输入，避免每次键入出现短暂无响应
                disabled={isProcessing}
              />
            </div>

            {/* 使用说明 */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">
                使用说明
              </h3>
              <div className="text-blue-800 text-sm space-y-2">
                {instructionSteps.map((step: string, index: number) => (
                  <p key={index}>
                    {index + 1}. {step}
                  </p>
                ))}
              </div>
            </div>
          </section>

          {/* 输出区域 */}
          <section className="space-y-6" aria-label="输出区域">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  格式化结果
                </h2>
              </div>

              <PerformanceIndicator
                isProcessing={isProcessing}
                isDebouncing={isDebouncing}
                dataLength={result ? 1 : 0}
                inputLength={inputLength}
              />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {/* 错误图标 - 装饰性图标，已通过周围文本描述，使用aria-hidden */}
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        错误
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isProcessing && !isDebouncing && !error && !result && (
                <div className="text-center py-12">
                  {/* 空状态图标 - 装饰性图标，已通过周围文本描述，使用aria-hidden */}
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暂无数据</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    请在左侧输入JSON内容
                  </p>
                </div>
              )}

              {!isProcessing && !isDebouncing && !error && result && (
                <div className="space-y-4">
                  <JsonFormatter result={result} />
                </div>
              )}
            </div>

            {/* 支持的数据类型 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                支持的数据类型
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="type-tag type-tag-string mr-2">string</span>
                    <span className="text-gray-600">字符串</span>
                  </div>
                  <div className="flex items-center">
                    <span className="type-tag type-tag-number mr-2">number</span>
                    <span className="text-gray-600">数字</span>
                  </div>
                  <div className="flex items-center">
                    <span className="type-tag type-tag-boolean mr-2">boolean</span>
                    <span className="text-gray-600">布尔值</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="type-tag type-tag-array mr-2">array</span>
                    <span className="text-gray-600">数组</span>
                  </div>
                  <div className="flex items-center">
                    <span className="type-tag type-tag-object mr-2">object</span>
                    <span className="text-gray-600">对象</span>
                  </div>
                  <div className="flex items-center">
                    <span className="type-tag type-tag-null mr-2">null</span>
                    <span className="text-gray-600">空值</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
