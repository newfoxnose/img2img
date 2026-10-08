'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Header from '@/components/gbk-gb2312/Header'
import Footer from '@/components/shared/Footer'
import CodeInput from '@/components/gbk-gb2312/CodeInput'
import PerformanceIndicator from '@/components/gbk-gb2312/PerformanceIndicator'
import { convertGBKToGB2312 } from '@/lib/gbk-gb2312/gbk2gb2312'

const instructionSteps = [
  '在输入框中粘贴GBK编码的文本内容',
  '工具会自动检测不在GB2312字符集中的字符',
  '使用相似字符智能替换，确保GB2312兼容性',
  '查看转换结果和替换的字符列表'
]

/**
 * GBK 转 GB2312 字符转换工具页面
 * 包含输入区域和转换结果显示区域
 */
export default function GbkToGb2312Page() {
  const [inputText, setInputText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  /**
   * 处理输入变化
   */
  const handleInputChange = (input: string) => {
    setInputText(input)
  }

  /**
   * 执行GBK到GB2312转换
   */
  const conversionResult = useMemo(() => {
    if (!inputText.trim()) {
      return null
    }

    try {
      const result = convertGBKToGB2312(inputText)
      return result
    } catch (error) {
      console.error('转换失败:', error)
      return null
    }
  }, [inputText])

  // 更新处理状态
  useEffect(() => {
    if (inputText.trim()) {
      setIsProcessing(true)
      // 模拟处理延迟（实际转换很快，这里主要是为了显示状态）
      const timer = setTimeout(() => {
        setIsProcessing(false)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setIsProcessing(false)
    }
  }, [inputText])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container-responsive py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 输入区域 */}
          <section className="space-y-6" aria-label="输入区域">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                输入GBK文本
              </h2>
              <CodeInput
                onInputChange={handleInputChange}
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
                  转换结果
                </h2>
                {conversionResult && conversionResult.replacedChars.length > 0 && (
                  <span className="text-sm text-gray-500">
                    替换了 {conversionResult.replacedChars.length} 个字符
                  </span>
                )}
              </div>

              <PerformanceIndicator
                isProcessing={isProcessing}
                isDebouncing={false}
                dataLength={conversionResult?.replacedChars.length || 0}
                inputLength={inputText.length}
              />

              {!isProcessing && !inputText.trim() && (
                <div className="text-center py-12">
                  {/* 空状态图标 - 装饰性图标，已通过周围文本描述，使用aria-hidden */}
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暂无数据</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    请在左侧输入GBK编码文本
                  </p>
                </div>
              )}

              {!isProcessing && conversionResult && (
                <div className="space-y-4">
                  {/* 转换结果 */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      转换后的文本
                    </h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap break-words">
                      {conversionResult.result}
                    </div>
                  </div>

                  {/* 替换统计 */}
                  {conversionResult.replacedChars.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        替换了 {conversionResult.replacedChars.length} 个字符
                      </h3>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <div className="space-y-2">
                          {conversionResult.replacedChars.map((item, index) => (
                            <div key={index} className="flex items-center space-x-4 text-sm">
                              <span className="font-mono text-gray-600">{item.original}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-mono text-gray-800">{item.replacement}</span>
                              <span className="text-gray-500 text-xs">
                                (位置: {item.position})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(conversionResult.result)
                      }}
                      className="px-4 py-2 text-sm bg-php-blue text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      复制结果
                    </button>
                  </div>
                </div>
              )}
            </div>

          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
