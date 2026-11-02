'use client'

import React, { useCallback, useMemo, useState } from 'react'
import Header from '@/components/json-formatter/Header'
import Footer from '@/components/shared/Footer'
import CodeInput from '@/components/json-formatter/CodeInput'
import JsonFormatter from '@/components/json-formatter/JsonFormatter'
import PerformanceIndicator from '@/components/json-formatter/PerformanceIndicator'
import { useJsonFormatter } from '@/hooks/useJsonFormatter'
import { diffLines, type DiffRow } from '@/lib/textDiff'
import {
  escapeForJsonString,
  jsonToCsv,
  jsonToXml,
  jsonToYaml,
  parseJsonValue,
  queryJsonPath,
  unescapeJsonString,
} from '@/lib/json-tools'

const instructionSteps = [
  '在输入框中粘贴或输入 JSON，工具会自动校验并格式化',
  '结果卡片顶部可切换「格式化 / 压缩」，并一键复制对应内容',
  '开启「排序键名」会递归按字母序排列对象键，不影响数组顺序',
  '支持字符串转义/去转义、YAML/XML/CSV 转换与 JSONPath 查询',
  '点击「同屏对比」可编辑两组 JSON，并开启差异行高亮'
]

type FormatterState = ReturnType<typeof useJsonFormatter>
type OutputMode = 'formatted' | 'minified'
type ConversionFormat = 'yaml' | 'xml' | 'csv'

interface OutputCardProps {
  title: string
  formatter: FormatterState
  inputLength: number
}

/**
 * 通用复制按钮
 */
function CopyButton({
  text,
  disabled = false,
}: {
  text: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (disabled) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 浏览器拒绝剪贴板权限时不改变按钮状态
    }
  }, [disabled, text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      aria-label={copied ? '已复制' : '复制内容'}
      className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-500 transition-colors"
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

/**
 * 下载按钮（浏览器本地生成文件）
 */
function DownloadButton({
  text,
  filename,
  mime,
  disabled = false,
}: {
  text: string
  filename: string
  mime: string
  disabled?: boolean
}) {
  const handleDownload = () => {
    if (disabled) return
    const blob = new Blob([text], { type: mime })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled}
      aria-label={`下载 ${filename}`}
      className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
    >
      下载
    </button>
  )
}

/**
 * 格式化结果卡片
 */
function OutputCard({ title, formatter, inputLength }: OutputCardProps) {
  const {
    result,
    error,
    errorLocation,
    isProcessing,
    isDebouncing,
    sortKeys,
    setSortKeys,
  } = formatter
  const [outputMode, setOutputMode] = useState<OutputMode>('formatted')

  const hasValidResult = Boolean(result?.isValid)
  const outputText = result
    ? outputMode === 'formatted'
      ? result.formatted
      : result.minified
    : ''

  const modeButtons: Array<{ key: OutputMode; label: string }> = [
    { key: 'formatted', label: '格式化' },
    { key: 'minified', label: '压缩' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1"
            role="group"
            aria-label="输出模式"
          >
            {modeButtons.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setOutputMode(item.key)}
                disabled={!hasValidResult}
                aria-pressed={outputMode === item.key}
                className={`px-3 py-1 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  outputMode === item.key
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={sortKeys}
              onChange={(event) => setSortKeys(event.target.checked)}
              disabled={!hasValidResult}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
            />
            排序键名
          </label>

          <CopyButton text={outputText} disabled={!hasValidResult} />
        </div>
      </div>

      <PerformanceIndicator
        isProcessing={isProcessing}
        isDebouncing={isDebouncing}
        dataLength={result ? 1 : 0}
        inputLength={inputLength}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              {/* 错误图标 - 装饰性图标，已通过周围文本描述，使用aria-hidden */}
              <svg className="h-5 w-5 text-red-400 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                错误
              </h3>
              {errorLocation && (
                <p className="mt-2 text-sm font-medium text-red-800 dark:text-red-300">
                  第 {errorLocation.line} 行第 {errorLocation.column} 列附近
                </p>
              )}
              <div className={`text-sm text-red-700 dark:text-red-300 break-all ${errorLocation ? 'mt-1' : 'mt-2'}`}>
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      {!isProcessing && !isDebouncing && !error && !result && (
        <div className="text-center py-12">
          {/* 空状态图标 - 装饰性图标，已通过周围文本描述，使用aria-hidden */}
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无数据</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            请在输入框中输入JSON内容
          </p>
        </div>
      )}

      {!isProcessing && !isDebouncing && !error && result && (
        <div className="space-y-4">
          <JsonFormatter result={result} outputMode={outputMode} />
        </div>
      )}
    </div>
  )
}

/**
 * 使用说明卡片
 */
function InstructionsCard() {
  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
        使用说明
      </h3>
      <div className="text-blue-800 dark:text-blue-200 text-sm space-y-2">
        {instructionSteps.map((step: string, index: number) => (
          <p key={index}>
            {index + 1}. {step}
          </p>
        ))}
      </div>
    </div>
  )
}

/**
 * 支持的数据类型卡片
 */
function DataTypesCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        支持的数据类型
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="type-tag type-tag-string mr-2 dark:bg-green-900/40 dark:text-green-300">string</span>
            <span className="text-gray-600 dark:text-gray-300">字符串</span>
          </div>
          <div className="flex items-center">
            <span className="type-tag type-tag-number mr-2 dark:bg-blue-900/40 dark:text-blue-300">number</span>
            <span className="text-gray-600 dark:text-gray-300">数字</span>
          </div>
          <div className="flex items-center">
            <span className="type-tag type-tag-boolean mr-2 dark:bg-yellow-900/40 dark:text-yellow-300">boolean</span>
            <span className="text-gray-600 dark:text-gray-300">布尔值</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center">
            <span className="type-tag type-tag-array mr-2 dark:bg-purple-900/40 dark:text-purple-300">array</span>
            <span className="text-gray-600 dark:text-gray-300">数组</span>
          </div>
          <div className="flex items-center">
            <span className="type-tag type-tag-object mr-2 dark:bg-orange-900/40 dark:text-orange-300">object</span>
            <span className="text-gray-600 dark:text-gray-300">对象</span>
          </div>
          <div className="flex items-center">
            <span className="type-tag type-tag-null mr-2 dark:bg-gray-700 dark:text-gray-300">null</span>
            <span className="text-gray-600 dark:text-gray-300">空值</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 转义 / 去转义卡片
 */
function EscapeCard({ source, sourceLabel }: { source: string; sourceLabel: string }) {
  const [output, setOutput] = useState('')
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)
  const hasSource = Boolean(source.trim())

  const handleEscape = () => {
    if (!hasSource) {
      setOutput('')
      setMessage({ tone: 'error', text: '请先输入内容后再转义。' })
      return
    }
    setOutput(escapeForJsonString(source))
    setMessage({
      tone: 'info',
      text: '转义完成：结果是一段单行 JSON 字符串字面量，可嵌入 JSON 值或代码字符串。',
    })
  }

  const handleUnescape = () => {
    if (!hasSource) {
      setOutput('')
      setMessage({ tone: 'error', text: '请先输入内容后再去转义。' })
      return
    }
    const parsed = unescapeJsonString(source)
    if (parsed.ok) {
      setOutput(parsed.value)
      setMessage({
        tone: 'info',
        text: parsed.value.trim()
          ? '去转义完成：已还原出一层真实文本。'
          : '去转义完成：还原结果是空字符串。',
      })
    } else {
      setOutput('')
      setMessage({ tone: 'error', text: `去转义失败：${parsed.error}` })
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          字符串转义 / 去转义
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleEscape}
            disabled={!hasSource}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-500 transition-colors"
          >
            转义
          </button>
          <button
            type="button"
            onClick={handleUnescape}
            disabled={!hasSource}
            className="px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            去转义
          </button>
          <CopyButton text={output} disabled={!output} />
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        作用于{sourceLabel}。转义会把整段文本变成 JSON 字符串；去转义会尝试解析一层被转义的字符串。
      </p>

      {message && (
        <p
          className={`mb-3 text-sm ${
            message.tone === 'error'
              ? 'text-red-600 dark:text-red-400'
              : 'text-blue-600 dark:text-blue-300'
          }`}
        >
          {message.text}
        </p>
      )}

      <pre className="min-h-[6rem] max-h-52 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs whitespace-pre-wrap break-all text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100">
        {output || '操作结果会显示在这里'}
      </pre>
    </div>
  )
}

/**
 * YAML / XML / CSV 转换卡片
 */
function ConversionCard({ sourceText, sourceLabel }: { sourceText: string; sourceLabel: string }) {
  const [format, setFormat] = useState<ConversionFormat>('yaml')
  const parsed = useMemo(() => parseJsonValue(sourceText), [sourceText])

  const conversion = useMemo(() => {
    if (!parsed.ok) {
      return { text: '', warnings: [] as string[], error: '' }
    }
    if (format === 'yaml') {
      return { text: jsonToYaml(parsed.value), warnings: [] as string[], error: '' }
    }
    if (format === 'xml') {
      const xml = jsonToXml(parsed.value)
      return { text: xml.text, warnings: xml.warnings, error: '' }
    }
    const csv = jsonToCsv(parsed.value)
    return csv.ok
      ? { text: csv.csv, warnings: [] as string[], error: '' }
      : { text: '', warnings: [] as string[], error: csv.error }
  }, [parsed, format])

  const hasOutput = parsed.ok && !conversion.error && Boolean(conversion.text)
  const mime =
    format === 'yaml'
      ? 'text/yaml;charset=utf-8'
      : format === 'xml'
        ? 'application/xml;charset=utf-8'
        : 'text/csv;charset=utf-8'

  const formatButtons: Array<{ key: ConversionFormat; label: string }> = [
    { key: 'yaml', label: 'YAML' },
    { key: 'xml', label: 'XML' },
    { key: 'csv', label: 'CSV' },
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          格式转换
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1"
            role="group"
            aria-label="目标格式"
          >
            {formatButtons.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFormat(item.key)}
                aria-pressed={format === item.key}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  format === item.key
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <CopyButton text={conversion.text} disabled={!hasOutput} />
          <DownloadButton
            text={conversion.text}
            filename={`converted.${format}`}
            mime={mime}
            disabled={!hasOutput}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        将{sourceLabel}的有效 JSON 转为 YAML / XML / CSV；CSV 仅支持根节点为对象数组。
      </p>

      {!sourceText.trim() && (
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          请先输入 JSON 内容，转换结果会自动生成。
        </p>
      )}

      {sourceText.trim() && !parsed.ok && (
        <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
          当前输入不是有效 JSON，无法转换。
        </p>
      )}

      {conversion.error && (
        <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          {conversion.error}
        </p>
      )}

      {conversion.warnings.length > 0 && (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-medium mb-1">键名安全化提示：</p>
          <ul className="list-disc list-inside space-y-1">
            {conversion.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {hasOutput && (
        <pre className="max-h-72 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100">
          {conversion.text}
        </pre>
      )}
    </div>
  )
}

/**
 * JSONPath 查询卡片
 */
function JsonPathCard({ sourceText, sourceLabel }: { sourceText: string; sourceLabel: string }) {
  const [query, setQuery] = useState('$')
  const [submittedQuery, setSubmittedQuery] = useState('$')
  const parsed = useMemo(() => parseJsonValue(sourceText), [sourceText])

  const pathResult = useMemo(() => {
    if (!parsed.ok || !submittedQuery.trim()) return null
    return queryJsonPath(parsed.value, submittedQuery)
  }, [parsed, submittedQuery])

  const formattedValues = useMemo(() => {
    if (!pathResult || !pathResult.ok) return []
    return pathResult.values.map((item) => JSON.stringify(item, null, 2))
  }, [pathResult])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setSubmittedQuery(value)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        JSONPath 查询
      </h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        在{sourceLabel}的有效 JSON 中查询。支持 $、.key、[&apos;key&apos;]、[index]、[*]、..key、..[*]。
      </p>

      <form
        className="flex flex-col sm:flex-row gap-2 mb-4"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmittedQuery(query)
        }}
      >
        <div className="flex-1">
          <label
            htmlFor="jsonpath-query"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            JSONPath 表达式
          </label>
          <input
            id="jsonpath-query"
            type="text"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            placeholder="$..name"
            spellCheck={false}
            aria-label="JSONPath 表达式"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!parsed.ok}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-500 transition-colors"
          >
            查询
          </button>
        </div>
      </form>

      {!sourceText.trim() && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          请先输入有效的 JSON 后再进行查询。
        </p>
      )}

      {sourceText.trim() && !parsed.ok && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          当前输入不是有效 JSON，无法执行 JSONPath 查询。
        </p>
      )}

      {parsed.ok && !submittedQuery.trim() && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          请输入 JSONPath 表达式，例如 $..name。
        </p>
      )}

      {pathResult && !pathResult.ok && (
        <p className="text-sm text-red-600 dark:text-red-400">{pathResult.error}</p>
      )}

      {pathResult && pathResult.ok && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              匹配 {pathResult.values.length} 个结果
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              表达式：{submittedQuery}
            </span>
          </div>

          {formattedValues.length === 0 ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              未匹配到任何结果，请检查 JSONPath 表达式或数据结构。
            </p>
          ) : (
            <div className="space-y-2 max-h-[32rem] overflow-auto">
              {formattedValues.map((value, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300">
                    结果 {index + 1}
                  </div>
                  <pre className="max-h-60 overflow-auto p-3 font-mono text-xs whitespace-pre text-gray-800 dark:text-gray-100">
                    {value}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 差异行左右单元格
 */
function getDiffTone(row: DiffRow, side: 'left' | 'right') {
  if (side === 'left') {
    if (row.type === 'remove' || row.type === 'change') {
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
        marker: '-',
      }
    }
    if (row.type === 'add') {
      return {
        bg: 'bg-gray-50 dark:bg-gray-800/40',
        text: 'text-transparent',
        marker: '',
      }
    }
  } else {
    if (row.type === 'add' || row.type === 'change') {
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-700 dark:text-green-300',
        marker: '+',
      }
    }
    if (row.type === 'remove') {
      return {
        bg: 'bg-gray-50 dark:bg-gray-800/40',
        text: 'text-transparent',
        marker: '',
      }
    }
  }

  return {
    bg: '',
    text: 'text-gray-800 dark:text-gray-200',
    marker: '',
  }
}

function DiffCell({ row, side }: { row: DiffRow; side: 'left' | 'right' }) {
  const tone = getDiffTone(row, side)
  const lineNumber = side === 'left' ? row.leftLine : row.rightLine
  const content = side === 'left' ? row.left : row.right

  return (
    <div
      className={`flex min-w-0 ${side === 'right' ? 'border-l border-gray-200 dark:border-gray-700' : ''} ${tone.bg}`}
    >
      <span className="w-11 shrink-0 py-1 pr-2 text-right font-mono text-xs leading-5 tabular-nums select-none text-gray-400 dark:text-gray-500">
        {lineNumber ?? ''}
      </span>
      <span className={`w-4 shrink-0 py-1 text-xs leading-5 select-none ${tone.text}`}>
        {tone.marker}
      </span>
      <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className={`whitespace-pre px-2 py-1 font-mono text-xs leading-5 ${tone.text}`}>
          {content === null || content === '' ? '\u00A0' : content}
        </div>
      </div>
    </div>
  )
}

/**
 * JSON 格式化工具页面
 * 支持单组模式与同屏对比两组数据
 */
export default function JsonFormatterPage() {
  const [compareMode, setCompareMode] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [inputA, setInputA] = useState('')
  const [inputLengthA, setInputLengthA] = useState(0)
  const [inputLengthB, setInputLengthB] = useState(0)

  // 两组独立的格式化状态，对比模式时各自驱动一列
  const formatterA = useJsonFormatter()
  const formatterB = useJsonFormatter()

  /**
   * 处理输入变化
   * 使用 useCallback 确保函数引用稳定，避免子组件不必要的重新渲染
   */
  const handleInputChangeA = useCallback((input: string) => {
    setInputA(input)
    setInputLengthA(input.length)
    formatterA.debouncedFormat(input)
  }, [formatterA.debouncedFormat])

  const handleInputChangeB = useCallback((input: string) => {
    setInputLengthB(input.length)
    formatterB.debouncedFormat(input)
  }, [formatterB.debouncedFormat])

  const canShowDiff = Boolean(
    formatterA.result?.isValid && formatterB.result?.isValid
  )

  const diffResult = useMemo(() => {
    if (!showDiff) return null
    if (!formatterA.result || !formatterB.result) return null
    return diffLines(formatterA.result.formatted, formatterB.result.formatted, {
      ignoreWhitespace: false,
    })
  }, [showDiff, formatterA.result, formatterB.result])

  // 进阶工具统一使用数据 A；单栏模式下即当前输入
  const toolsSource = inputA.trim()
    ? inputA
    : formatterA.result?.formatted ?? ''
  const toolsSourceLabel = compareMode ? '数据 A' : '当前输入'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <main className="container-responsive py-8">
        {/* 模式切换 */}
        <div className="flex flex-wrap justify-end items-center gap-4 mb-4">
          {compareMode && (
            <>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={showDiff}
                  onChange={(event) => setShowDiff(event.target.checked)}
                  disabled={!canShowDiff}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700"
                />
                显示差异
              </label>
              {!canShowDiff && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  两侧均为有效 JSON 后可对比差异
                </span>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => setCompareMode((prev) => !prev)}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded transition-colors ${
              compareMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            aria-pressed={compareMode}
          >
            {/* 对比图标 - 装饰性图标，已通过按钮文本描述，使用aria-hidden */}
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            {compareMode ? '退出对比' : '同屏对比'}
          </button>
        </div>

        {compareMode ? (
          <>
            {/* 对比模式：两列各含一组输入与格式化结果 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {[
                {
                  label: '数据 A',
                  formatter: formatterA,
                  handleInput: handleInputChangeA,
                  inputLength: inputLengthA,
                  inputId: 'json-input-a'
                },
                {
                  label: '数据 B',
                  formatter: formatterB,
                  handleInput: handleInputChangeB,
                  inputLength: inputLengthB,
                  inputId: 'json-input-b'
                }
              ].map((group) => (
                <section key={group.label} className="space-y-4" aria-label={group.label}>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      {group.label} · 输入JSON
                    </h2>
                    <CodeInput
                      id={group.inputId}
                      label={`${group.label} · 输入JSON`}
                      onInputChange={group.handleInput}
                      disabled={group.formatter.isProcessing}
                    />
                  </div>
                  <OutputCard
                    title={`${group.label} · 格式化结果`}
                    formatter={group.formatter}
                    inputLength={group.inputLength}
                  />
                </section>
              ))}
            </div>

            {/* 差异高亮 */}
            {showDiff && (
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    差异对比
                  </h2>
                  {diffResult && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        新增 {diffResult.added} 行
                      </span>
                      <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        删除 {diffResult.removed} 行
                      </span>
                      <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        修改 {diffResult.changed} 行
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        共 {diffResult.rows.length} 行
                      </span>
                    </div>
                  )}
                </div>

                {!diffResult ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    两侧都需要有效的 JSON 才能显示差异，请检查输入。
                  </p>
                ) : (
                  <>
                    {diffResult.truncated && (
                      <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                        文本过长，已退化为逐行比较，结果可能与精确差异略有出入。
                      </p>
                    )}

                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto overflow-x-hidden max-h-[70vh]">
                      <div className="sticky top-0 z-10 grid grid-cols-2 bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                        <div className="px-3 py-2">数据 A（格式化结果）</div>
                        <div className="px-3 py-2 border-l border-gray-200 dark:border-gray-600">
                          数据 B（格式化结果）
                        </div>
                      </div>
                      {diffResult.rows.map((row, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-2 border-b border-gray-100 dark:border-gray-700/60 last:border-b-0"
                        >
                          <DiffCell row={row} side="left" />
                          <DiffCell row={row} side="right" />
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                      红色为删除或修改前内容，绿色为新增或修改后内容；行内过长时可左右滑动查看。
                    </p>
                  </>
                )}
              </div>
            )}

            {/* 说明与数据类型 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <InstructionsCard />
              <DataTypesCard />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 输入区域 */}
            <section className="space-y-6" aria-label="输入区域">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  输入JSON
                </h2>
                <CodeInput
                  id="json-input-a"
                  label="输入JSON"
                  onInputChange={handleInputChangeA}
                  // 防抖阶段仍允许继续输入，避免每次键入出现短暂无响应
                  disabled={formatterA.isProcessing}
                />
              </div>

              <InstructionsCard />
            </section>

            {/* 输出区域 */}
            <section className="space-y-6" aria-label="输出区域">
              <OutputCard
                title="格式化结果"
                formatter={formatterA}
                inputLength={inputLengthA}
              />

              <DataTypesCard />
            </section>
          </div>
        )}

        {/* 进阶工具：排序、转义、格式转换与 JSONPath */}
        <section className="mt-8 space-y-6" aria-label="JSON 进阶工具">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EscapeCard source={toolsSource} sourceLabel={toolsSourceLabel} />
            <ConversionCard sourceText={toolsSource} sourceLabel={toolsSourceLabel} />
          </div>
          <JsonPathCard sourceText={toolsSource} sourceLabel={toolsSourceLabel} />
        </section>
      </main>

      <Footer />
    </div>
  )
}
