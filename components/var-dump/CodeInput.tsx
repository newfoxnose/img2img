'use client'

import React, { useState } from 'react'
import type { InputFormat } from '@/lib/var-dump/formatConverter'

interface CodeInputProps {
  onInputChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  format?: InputFormat
}

const inputTips = [
  '支持 PHP var_dump / print_r、json_encode 与 Laravel dump()/dd() 的常见输出',
  '自动识别失败时，可在页面顶部手动选择输入格式',
  '支持嵌套数组与对象，数字、布尔、NULL 会尽量按类型推断',
  '点击「加载示例」可填入与当前格式匹配的示例内容'
]

const EXAMPLES: Record<InputFormat, string> = {
  auto: `array(4) { ["grade"]=> int(0) ["class_arr"]=> array(1) { [0]=> array(3) { ["class"]=> string(1) "1" ["amount"]=> string(0) "" ["female"]=> string(0) "" } } ["amount_sum"]=> int(0) ["female_sum"]=> int(0) }`,
  vardump: `array(4) { ["grade"]=> int(0) ["class_arr"]=> array(1) { [0]=> array(3) { ["class"]=> string(1) "1" ["amount"]=> string(0) "" ["female"]=> string(0) "" } } ["amount_sum"]=> int(0) ["female_sum"]=> int(0) }`,
  printr: `Array
(
    [name] => 张三
    [age] => 25
    [tags] => Array
        (
            [0] => a
            [1] => b
        )
)`,
  json: `{"name":"张三","age":25,"score":95.5,"active":true,"address":null,"tags":["a","b"]}`,
  laravel: `array:3 [
  "name" => "张三"
  "age" => 25
  "tags" => array:2 [
    0 => "a"
    1 => "b"
  ]
]`
}

/**
 * 代码输入组件
 * 用于输入调试输出内容
 */
export default function CodeInput({
  onInputChange,
  placeholder,
  disabled = false,
  format = 'auto'
}: CodeInputProps) {
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
    const example = EXAMPLES[format]
    setInput(example)
    onInputChange(example)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label
          htmlFor="vardump-input"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          输入调试输出内容
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
        placeholder={
          placeholder || '请粘贴 var_dump / print_r / JSON / Laravel dump 输出内容...'
        }
        disabled={disabled}
        className={`w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-php-blue focus:border-transparent dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 ${
          disabled ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400' : ''
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
