'use client'

import React, { useState } from 'react'

interface CodeInputProps {
  onInputChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const inputTips = [
  '直接粘贴PHP var_dump()函数的输出内容',
  '支持字符串、数字、布尔值、数组、对象、NULL等所有PHP数据类型',
  '支持嵌套数组和对象的格式化显示',
  '点击示例按钮查看支持的格式'
]

/**
 * 代码输入组件
 * 用于输入var_dump输出内容
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
    const example = `array(4) { ["grade"]=> int(0) ["class_arr"]=> array(1) { [0]=> array(3) { ["class"]=> string(1) "1" ["amount"]=> string(0) "" ["female"]=> string(0) "" } } ["amount_sum"]=> int(0) ["female_sum"]=> int(0) }`
    setInput(example)
    onInputChange(example)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label htmlFor="vardump-input" className="block text-sm font-medium text-gray-700">
          输入var_dump输出
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
        id="vardump-input"
        value={input}
        onChange={handleInputChange}
        placeholder={placeholder || '请粘贴您的var_dump输出内容...'}
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
