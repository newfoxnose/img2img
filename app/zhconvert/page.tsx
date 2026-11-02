'use client'

import { useCallback, useMemo, useState } from 'react'
import OpenCC from 'opencc-js'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['简繁互转', '台湾/香港用词', '实时转换', '本地处理']

type DirectionKey = 'cn-tw' | 'cn-hk' | 'tw-cn' | 'hk-cn'

interface DirectionDef {
  key: DirectionKey
  label: string
  hint: string
  from: string
  to: string
}

const DIRECTIONS: DirectionDef[] = [
  { key: 'cn-tw', label: '简体 → 繁体（台湾）', hint: 'cn → tw', from: 'cn', to: 'tw' },
  { key: 'cn-hk', label: '简体 → 繁体（香港）', hint: 'cn → hk', from: 'cn', to: 'hk' },
  { key: 'tw-cn', label: '繁体（台湾）→ 简体', hint: 'tw → cn', from: 'tw', to: 'cn' },
  { key: 'hk-cn', label: '繁体（香港）→ 简体', hint: 'hk → cn', from: 'hk', to: 'cn' },
]

const SAMPLE = '这个软件支持简体与繁体中文互相转换，覆盖常用词汇与台湾、香港用词差异。'

const LARGE_TEXT_THRESHOLD = 20000

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function CopyButton({ text }: { text: string }) {
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
      disabled={!text}
      className="shrink-0 px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    >
      {copied ? '已复制' : '复制结果'}
    </button>
  )
}

export default function ZhConvertPage() {
  const [directionKey, setDirectionKey] = useState<DirectionKey>('cn-tw')
  const [text, setText] = useState('')

  const direction = DIRECTIONS.find((item) => item.key === directionKey) ?? DIRECTIONS[0]

  // 转换器创建有一定成本，按方向缓存复用
  const converter = useMemo(
    () => OpenCC.Converter({ from: direction.from, to: direction.to }),
    [direction.from, direction.to]
  )

  const converted = useMemo(() => {
    if (!text) return ''
    try {
      return converter(text)
    } catch {
      return ''
    }
  }, [converter, text])

  const charCount = text.length
  const visibleCount = text.replace(/\s/g, '').length
  const isLargeText = text.length > LARGE_TEXT_THRESHOLD

  const handleSwap = useCallback(() => {
    if (!converted) return
    setText(converted)
  }, [converted])

  return (
    <div>
      <ToolHeader
        title="简繁转换"
        description="简体中文与繁体中文互转，支持台湾、香港用词差异，输入即可实时查看转换结果"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* 方向选择 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">转换方向</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {DIRECTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDirectionKey(item.key)}
                  className={`px-3 py-2.5 text-sm rounded-lg border text-left transition-colors ${
                    item.key === directionKey
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="block">{item.label}</span>
                  <span className="block mt-0.5 text-xs font-mono opacity-60">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 输入与结果 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <label htmlFor="zhconvert-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  原文
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setText(SAMPLE)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    加载示例
                  </button>
                  <button
                    type="button"
                    onClick={() => setText('')}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    清空
                  </button>
                </div>
              </div>
              <textarea
                id="zhconvert-input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="在这里输入或粘贴要转换的中文文本"
                className="w-full h-72 p-4 rounded-lg border border-gray-300 bg-white text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {charCount} 字符（不含空白 {visibleCount} 字符）
              </p>
              {isLargeText && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  文本超过 {LARGE_TEXT_THRESHOLD} 字符，转换可能需要一些时间，页面会保持可编辑状态并继续转换。
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">转换结果</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSwap}
                    disabled={!converted}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    交换原文/结果
                  </button>
                  <CopyButton text={converted} />
                </div>
              </div>
              <div className="h-72 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-7 whitespace-pre-wrap break-words dark:border-gray-700 dark:bg-gray-900/40">
                {converted ? (
                  <span className="text-gray-900 dark:text-gray-100">{converted}</span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">
                    输入原文后，这里会实时显示转换结果
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {converted.length} 字符
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 转换基于 OpenCC 词库，覆盖常用词汇及台湾、香港用词差异。</p>
            <p>2. 专有名词、人名、地名与网络新词可能存在差异，结果仅供参考。</p>
            <p>3. 所有文本仅在浏览器本地转换，不会上传；大段文本仍可正常转换。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
