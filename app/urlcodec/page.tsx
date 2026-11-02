'use client'

import { useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['URL 编码', 'URL 解码', '查询参数解析', '参数 JSON', '本地处理']

type Mode = 'encode' | 'decode'
type Method = 'component' | 'uri'

interface QueryParamRow {
  key: string
  rawValue: string
  decodedValue: string
}

interface ParseResult {
  rows: QueryParamRow[]
  error: string
}

function parseQueryParams(input: string): QueryParamRow[] {
  const trimmed = input.trim()
  if (!trimmed) return []

  let search = ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    let parsed: URL
    try {
      parsed = new URL(trimmed)
    } catch {
      throw new Error('URL 格式无效，请检查协议、域名与参数是否完整')
    }
    search = parsed.search
  } else if (trimmed.includes('?')) {
    search = trimmed.slice(trimmed.indexOf('?') + 1)
  } else {
    search = trimmed
  }

  search = search.replace(/^[?#]/, '')
  const hashIndex = search.indexOf('#')
  if (hashIndex >= 0) {
    search = search.slice(0, hashIndex)
  }
  if (!search) return []

  return search
    .split('&')
    .filter((part) => part !== '')
    .map((part, index) => {
      const equalIndex = part.indexOf('=')
      const rawKey = equalIndex >= 0 ? part.slice(0, equalIndex) : part
      const rawValue = equalIndex >= 0 ? part.slice(equalIndex + 1) : ''

      let key: string
      try {
        key = decodeURIComponent(rawKey.replace(/\+/g, ' '))
      } catch {
        throw new Error(`第 ${index + 1} 个参数名包含非法的百分号编码`)
      }

      let decodedValue: string
      try {
        decodedValue = decodeURIComponent(rawValue.replace(/\+/g, ' '))
      } catch {
        throw new Error(`参数“${key}”的值包含非法的百分号编码`)
      }

      return { key, rawValue, decodedValue }
    })
}

function CopyButton({
  text,
  label = '复制',
  disabled = false,
}: {
  text: string
  label?: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text || disabled) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled || !text}
      className="shrink-0 px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
    >
      {copied ? '已复制' : label}
    </button>
  )
}

export default function UrlCodecPage() {
  const [mode, setMode] = useState<Mode>('encode')
  const [method, setMethod] = useState<Method>('component')
  const [input, setInput] = useState('')
  const [paramInput, setParamInput] = useState('')

  const textResult = useMemo<{ value: string; error: string }>(() => {
    if (!input) return { value: '', error: '' }
    try {
      if (mode === 'encode') {
        return {
          value: method === 'component' ? encodeURIComponent(input) : encodeURI(input),
          error: '',
        }
      }
      return {
        value: method === 'component' ? decodeURIComponent(input) : decodeURI(input),
        error: '',
      }
    } catch {
      return {
        value: '',
        error:
          mode === 'encode'
            ? '编码失败：文本包含无法编码的字符（可能是不完整的代理对）'
            : '解码失败：输入中包含不完整或非法的百分号编码（% 后应为两位十六进制数）',
      }
    }
  }, [input, mode, method])

  const parseResult = useMemo<ParseResult>(() => {
    if (!paramInput.trim()) return { rows: [], error: '' }
    try {
      return { rows: parseQueryParams(paramInput), error: '' }
    } catch (err) {
      return {
        rows: [],
        error: err instanceof Error ? err.message : '解析失败，请检查输入内容',
      }
    }
  }, [paramInput])

  const paramsJson = useMemo(() => {
    if (parseResult.rows.length === 0) return ''
    const result: Record<string, string | string[]> = {}
    for (const row of parseResult.rows) {
      const existing = result[row.key]
      if (existing === undefined) {
        result[row.key] = row.decodedValue
      } else if (Array.isArray(existing)) {
        existing.push(row.decodedValue)
      } else {
        result[row.key] = [existing, row.decodedValue]
      }
    }
    return JSON.stringify(result, null, 2)
  }, [parseResult.rows])

  const handleSwap = () => {
    if (textResult.value) {
      setInput(textResult.value)
    }
    setMode(mode === 'encode' ? 'decode' : 'encode')
  }

  return (
    <div>
      <ToolHeader
        title="URL 编解码"
        description="URL 编码与解码，支持组件编码和整段 URL，并可将查询参数自动解析为表格"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 模式与方式 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                {[
                  { key: 'encode', label: '编码' },
                  { key: 'decode', label: '解码' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key as Mode)}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      mode === item.key
                        ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-800 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSwap}
                className="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                交换方向
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">处理方式</p>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    key: 'component',
                    label: `${mode === 'encode' ? 'encodeURIComponent' : 'decodeURIComponent'}（组件）`,
                  },
                  {
                    key: 'uri',
                    label: `${mode === 'encode' ? 'encodeURI' : 'decodeURI'}（整段 URL）`,
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMethod(item.key as Method)}
                    aria-pressed={method === item.key}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      method === item.key
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {method === 'component'
                  ? '组件模式会编码 : / ? # 等保留字符，适合参数名与参数值。'
                  : '整段 URL 模式会保留 : / ? # 等结构字符，适合处理完整链接。'}
              </p>
            </div>
          </div>

          {/* 转换输入 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="urlcodec-input"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {mode === 'encode' ? '输入要编码的内容' : '输入要解码的内容'}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  清空
                </button>
                <button
                  type="button"
                  onClick={handleSwap}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  交换方向
                </button>
              </div>
            </div>

            <textarea
              id="urlcodec-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                mode === 'encode'
                  ? '例如：https://example.com/搜索?q=中文 & 空格'
                  : '例如：https%3A%2F%2Fexample.com%2F%E6%90%9C%E7%B4%A2%3Fq%3D%E4%B8%AD%E6%96%87'
              }
              spellCheck={false}
              className="w-full h-40 p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 转换结果 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {mode === 'encode' ? '编码结果' : '解码结果'}
              </h2>
              <CopyButton text={textResult.value} />
            </div>

            {textResult.error ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {textResult.error}
              </p>
            ) : textResult.value ? (
              <pre className="max-h-64 overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
                <code className="font-mono text-sm break-all whitespace-pre-wrap text-gray-800 dark:text-gray-100">
                  {textResult.value}
                </code>
              </pre>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">结果将在这里实时显示。</p>
            )}
          </div>

          {/* 查询参数解析 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">查询参数解析</h2>
              <div className="flex items-center gap-2">
                <CopyButton text={paramsJson} label="复制参数 JSON" disabled={!paramsJson} />
                <button
                  type="button"
                  onClick={() => setParamInput('')}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  清空
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="urlcodec-params"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                完整 URL 或查询字符串
              </label>
              <textarea
                id="urlcodec-params"
                value={paramInput}
                onChange={(event) => setParamInput(event.target.value)}
                placeholder="例如：https://example.com/search?q=%E4%B8%AD%E6%96%87&tag=a&tag=b"
                spellCheck={false}
                className="w-full h-32 p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {parseResult.error ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {parseResult.error}
              </p>
            ) : parseResult.rows.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                          参数名
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                          值
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                          解码后的值
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.rows.map((row, index) => (
                        <tr
                          key={`${index}-${row.key}`}
                          className="border-t border-gray-200 dark:border-gray-700"
                        >
                          <td className="px-3 py-2 font-mono break-all text-gray-800 dark:text-gray-100">
                            {row.key || '（空参数名）'}
                          </td>
                          <td className="px-3 py-2 font-mono break-all text-gray-600 dark:text-gray-300">
                            {row.rawValue || '（空）'}
                          </td>
                          <td className="px-3 py-2 font-mono break-all text-gray-800 dark:text-gray-100">
                            {row.decodedValue || '（空）'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  共 {parseResult.rows.length} 个参数；重复参数会按出现顺序逐行列出，JSON 中自动合并为数组。
                </p>
              </>
            ) : paramInput.trim() ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">未在输入中发现查询参数。</p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                输入完整 URL 或 a=1&amp;b=2 形式的查询字符串后，这里会显示参数表格。
              </p>
            )}
          </div>

          {/* 说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              1. <code className="font-mono">encodeURI</code>
              用于整段 URL，会保留 <code className="font-mono">: / ? # [ ] @ &amp; = +</code> 等结构字符，避免 URL 被破坏。
            </p>
            <p>
              2. <code className="font-mono">encodeURIComponent</code>
              用于参数名或参数值，会编码上述保留字符，确保内容安全地放入 URL。
            </p>
            <p>
              3. 查询参数解析会把 <code className="font-mono">+</code> 视为空格；如需保留加号，编码时应写成
              <code className="font-mono ml-1">%2B</code>。
            </p>
            <p>4. 所有处理均在浏览器本地完成，不会上传数据，也不会把内容写入 URL。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
