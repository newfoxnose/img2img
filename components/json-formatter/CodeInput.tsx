'use client'

import React, { useId, useState } from 'react'

interface CodeInputProps {
  onInputChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  label?: string
}

const inputTips = [
  '直接粘贴JSON字符串或对象',
  '支持所有标准JSON数据类型：字符串、数字、布尔值、数组、对象、null',
  '支持嵌套数组和对象的格式化显示',
  '结果卡片中可切换键名排序、YAML/XML/CSV 转换与 JSONPath 查询'
]

/**
 * 代码输入组件
 * 用于输入JSON内容
 */
export default function CodeInput({
  onInputChange,
  placeholder,
  disabled = false,
  id,
  label = '输入JSON',
}: CodeInputProps) {
  const [input, setInput] = useState('')
  const generatedId = useId()
  const inputId = id ?? `code-input-${generatedId}`

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
    const example = `{"name":"张三","age":25,"isStudent":true,"courses":["数学","英语"],"address":{"city":"北京","zipcode":"100000"},"nickname":null}`
    setInput(example)
    onInputChange(example)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={loadExample}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            加载示例
          </button>
          <button
            type="button"
            onClick={clearInput}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      <textarea
        id={inputId}
        value={input}
        onChange={handleInputChange}
        placeholder={placeholder || '请粘贴您的JSON内容...'}
        disabled={disabled}
        aria-label={label}
        className={`w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
          disabled ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800' : ''
        }`}
        spellCheck={false}
      />

      <div className="text-sm text-gray-500 dark:text-gray-400">
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
