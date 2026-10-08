'use client'

import React, { useState } from 'react'

interface CodeInputProps {
  onInputChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const inputTips = [
  '直接粘贴GBK编码的文本内容',
  '工具会自动检测不在GB2312中的字符',
  '使用相似字符智能替换，保持文本可读性',
  '点击示例按钮查看转换效果'
]

/**
 * 代码输入组件
 * 用于输入GBK编码文本
 */
export default function CodeInput({ onInputChange, placeholder, disabled = false }: CodeInputProps) {
  const [input, setInput] = useState('')

  /**
   * 处理输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)
    onInputChange(value)
  }

  /**
   * 清空输入
   */
  const clearInput = () => {
    setInput('')
    onInputChange('')
  }

  /**
   * 加载示例数据
   */
  const loadExample = () => {
    // 示例文本包含一些GBK扩展字符（不在GB2312中）
    const example = `镕基总理曾任职国务院。这是一个包含GBK扩展字符的示例文本，工具会将"镕"替换为"熔"。`
    setInput(example)
    onInputChange(example)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label htmlFor="gbk-input" className="block text-sm font-medium text-gray-700">
          输入GBK文本
        </label>
        <div className="flex space-x-2">
          <button
            onClick={loadExample}
            className="px-3 py-1 text-sm bg-php-blue text-white rounded hover:bg-blue-600 transition-colors"
          >
            加载示例
          </button>
          <button
            onClick={clearInput}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      <textarea
        id="gbk-input"
        value={input}
        onChange={handleInputChange}
        placeholder={placeholder || '请粘贴需要转换的GBK编码文本...'}
        disabled={disabled}
        className={`w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-php-blue focus:border-transparent ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        }`}
        spellCheck={false}
      />

      <div className="text-sm text-gray-500">
        <p>💡 提示：</p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          {inputTips.map((tip: string, index: number) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
