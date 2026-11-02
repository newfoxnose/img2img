'use client'

import { useCallback, useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['实时高亮', '捕获分组', '替换预览', '常用模板']

const MAX_TEXT = 100000
const MAX_MATCHES = 5000
const MAX_PATTERN = 2000

const secondaryButtonClass =
  'px-3 py-1.5 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'

type FlagKey = 'g' | 'i' | 'm' | 's' | 'u' | 'y'

const FLAG_OPTIONS: { key: FlagKey; label: string }[] = [
  { key: 'g', label: 'g 全局匹配' },
  { key: 'i', label: 'i 忽略大小写' },
  { key: 'm', label: 'm 多行模式' },
  { key: 's', label: 's 点号匹配换行' },
  { key: 'u', label: 'u Unicode 模式' },
  { key: 'y', label: 'y 粘性匹配' },
]

const TEMPLATES: { name: string; pattern: string }[] = [
  { name: '邮箱', pattern: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}` },
  { name: '手机号', pattern: String.raw`1[3-9]\d{9}` },
  { name: 'URL', pattern: String.raw`https?://[^\s"'<>]+` },
  {
    name: 'IPv4',
    pattern: String.raw`(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)`,
  },
  { name: '日期', pattern: String.raw`(\d{4})-(\d{2})-(\d{2})` },
  {
    name: '身份证号',
    pattern: String.raw`[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]`,
  },
]

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续尝试兼容方案
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

function CopyButton({ text, disabled = false }: { text: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    if (!text) return
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className={`${secondaryButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

interface MatchItem {
  index: number
  end: number
  value: string
  captures: (string | undefined)[]
  named: [string, string | undefined][]
}

interface RegexResult {
  matches: MatchItem[]
  error: string
  truncated: boolean
}

function runRegex(pattern: string, flagString: string, text: string): RegexResult {
  if (!pattern) return { matches: [], error: '', truncated: false }
  if (pattern.length > MAX_PATTERN) {
    return {
      matches: [],
      error: `正则表达式过长（${pattern.length} 字符），请精简到 ${MAX_PATTERN} 字符以内`,
      truncated: false,
    }
  }
  if (text.length > MAX_TEXT) {
    return {
      matches: [],
      error: `测试文本超过 ${MAX_TEXT} 字符，为保护性能已暂停匹配`,
      truncated: false,
    }
  }

  let regex: RegExp
  try {
    regex = new RegExp(pattern, flagString)
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    return { matches: [], error: `正则表达式无效：${message}`, truncated: false }
  }

  const matches: MatchItem[] = []
  let truncated = false
  if (text) {
    const globalMode = regex.global || regex.sticky
    let match = regex.exec(text)
    while (match !== null) {
      const value = match[0]
      const captures = Array.from(match.slice(1)) as (string | undefined)[]
      const named = Object.entries(match.groups ?? {}) as [string, string | undefined][]
      matches.push({
        index: match.index,
        end: match.index + value.length,
        value,
        captures,
        named,
      })
      // 零长度匹配时手动推进 lastIndex，避免死循环
      if (value.length === 0) regex.lastIndex += 1
      if (!globalMode) break
      if (matches.length >= MAX_MATCHES) {
        truncated = true
        break
      }
      match = regex.exec(text)
    }
  }

  return { matches, error: '', truncated }
}

export default function RegexPage() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<Record<FlagKey, boolean>>({
    g: true,
    i: false,
    m: false,
    s: false,
    u: false,
    y: false,
  })
  const [text, setText] = useState('')
  const [replacement, setReplacement] = useState('')

  const flagString = useMemo(
    () => (Object.keys(flags) as FlagKey[]).filter((key) => flags[key]).join(''),
    [flags]
  )

  const result = useMemo(() => runRegex(pattern, flagString, text), [pattern, flagString, text])

  const segments = useMemo(() => {
    const parts: { text: string; match: MatchItem | null }[] = []
    let cursor = 0
    for (const item of result.matches) {
      if (item.end <= item.index) continue
      if (item.index < cursor || item.index > text.length) continue
      parts.push({ text: text.slice(cursor, item.index), match: null })
      parts.push({ text: text.slice(item.index, item.end), match: item })
      cursor = item.end
    }
    parts.push({ text: text.slice(cursor), match: null })
    return parts
  }, [text, result.matches])

  const replacementResult = useMemo(() => {
    if (!pattern || result.error) return ''
    try {
      return text.replace(new RegExp(pattern, flagString), replacement)
    } catch {
      return ''
    }
  }, [pattern, flagString, replacement, text, result.error])

  const toggleFlag = (key: FlagKey) => {
    setFlags((previous) => ({ ...previous, [key]: !previous[key] }))
  }

  return (
    <div>
      <ToolHeader
        title="正则测试"
        description="实时测试正则表达式，高亮全部匹配与捕获分组，支持替换预览和常用正则模板"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 正则与标志 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div>
              <label
                htmlFor="regex-pattern"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                正则表达式
              </label>
              <input
                id="regex-pattern"
                type="text"
                value={pattern}
                onChange={(event) => setPattern(event.target.value)}
                placeholder="例如：(\d{4})-(\d{2})-(\d{2})"
                spellCheck={false}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                无需输入首尾的 / 斜杠，只填写表达式本身。
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">标志 flags</p>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300">
                {FLAG_OPTIONS.map((option) => (
                  <label key={option.key} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={flags[option.key]}
                      onChange={() => toggleFlag(option.key)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                当前 flags：<span className="font-mono">{flagString || '(无)'}</span>
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">常用模板</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => setPattern(template.pattern)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-blue-400"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {result.error && (
              <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
            )}
          </section>

          {/* 测试文本 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="regex-text"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                测试文本
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {text.length} / {MAX_TEXT}
              </span>
            </div>
            <textarea
              id="regex-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={MAX_TEXT}
              placeholder="粘贴或输入需要匹配的文本，结果会实时高亮"
              spellCheck={false}
              className="w-full h-40 p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </section>

          {/* 高亮与匹配详情 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                匹配结果（{result.matches.length}）
              </h2>
              {result.truncated && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  匹配数量过多，最多展示 {MAX_MATCHES} 个
                </span>
              )}
            </div>

            {text.length > 0 ? (
              <pre className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm break-all whitespace-pre-wrap text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100">
                {segments.map((segment, index) =>
                  segment.match ? (
                    <mark
                      key={index}
                      className="rounded bg-yellow-300 px-0.5 text-gray-900 dark:bg-yellow-500 dark:text-gray-900"
                    >
                      {segment.text}
                    </mark>
                  ) : (
                    <span key={index}>{segment.text}</span>
                  )
                )}
              </pre>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                输入测试文本后，这里会实时高亮匹配内容。
              </p>
            )}

            {result.matches.length > 0 && (
              <div className="space-y-2">
                {result.matches.map((item, index) => (
                  <div
                    key={`${item.index}-${index}`}
                    className="rounded-lg border border-gray-100 p-3 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                        #{index + 1}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        index: {item.index} - {item.end}
                      </span>
                    </div>
                    <code className="mt-1 block font-mono text-sm break-all text-gray-800 dark:text-gray-100">
                      {item.value === '' ? '(零长度匹配)' : item.value}
                    </code>

                    {item.captures.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.captures.map((group, groupIndex) => (
                          <p
                            key={`capture-${groupIndex}`}
                            className="text-xs text-gray-600 dark:text-gray-300"
                          >
                            分组 {groupIndex + 1}：
                            <span className="font-mono">{group ?? '(未匹配)'}</span>
                          </p>
                        ))}
                      </div>
                    )}

                    {item.named.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {item.named.map(([name, value]) => (
                          <p
                            key={`named-${name}`}
                            className="text-xs text-gray-600 dark:text-gray-300"
                          >
                            命名分组 {name}：
                            <span className="font-mono">{value ?? '(未匹配)'}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 替换 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">替换预览</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {'支持 $1、$2、$<name>、$& 等替换语法；未勾选 g 时只替换第一个匹配。'}
              </p>
            </div>

            <div>
              <label
                htmlFor="regex-replacement"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                替换文本
              </label>
              <input
                id="regex-replacement"
                type="text"
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                placeholder="例如：$1/$2/$3"
                spellCheck={false}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">替换结果</p>
                <CopyButton text={replacementResult} disabled={!replacementResult} />
              </div>
              {replacementResult ? (
                <pre className="max-h-60 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm break-all whitespace-pre-wrap text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100">
                  {replacementResult}
                </pre>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  输入正则与测试文本后，这里会显示替换结果。
                </p>
              )}
            </div>
          </section>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 所有匹配与替换均在浏览器本地执行，不会上传文本内容。</p>
            <p>2. 零长度匹配会自动推进索引，避免 stuck；匹配数超过 {MAX_MATCHES} 个时会截断展示。</p>
            <p>3. 复杂正则（如嵌套量词）可能产生灾难性回溯，请避免在超长文本上使用不确定的表达式。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
