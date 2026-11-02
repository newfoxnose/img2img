'use client'

import { useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'
import { diffLines, type DiffRow } from '@/lib/textDiff'

const features = ['行级对比', '忽略空白/大小写', '左右对照', '本地处理']

const SAMPLE_LEFT = `function greet(name) {
  const message = 'Hello, ' + name
  console.log(message)
  return message
}

greet('Alice')
greet('Bob')`

const SAMPLE_RIGHT = `function greet(name) {
  const message = \`Hello, \${name}!\`
  console.log(message)
  return message
}

greet('Alice')
greet('Carol')
greet('Dave')`

type Side = 'left' | 'right'

interface Tone {
  bg: string
  text: string
  marker: string
}

function getTone(row: DiffRow, side: Side): Tone {
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

function DiffCell({
  row,
  side,
}: {
  row: DiffRow
  side: Side
}) {
  const tone = getTone(row, side)
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

export default function DiffPage() {
  const [leftText, setLeftText] = useState('')
  const [rightText, setRightText] = useState('')
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [ignoreCase, setIgnoreCase] = useState(false)

  const result = useMemo(() => {
    if (!leftText || !rightText) return null
    return diffLines(leftText, rightText, { ignoreWhitespace, ignoreCase })
  }, [leftText, rightText, ignoreWhitespace, ignoreCase])

  const bothEmpty = !leftText && !rightText

  const handleSwap = () => {
    setLeftText(rightText)
    setRightText(leftText)
  }

  const handleClear = () => {
    setLeftText('')
    setRightText('')
  }

  const handleSample = () => {
    setLeftText(SAMPLE_LEFT)
    setRightText(SAMPLE_RIGHT)
  }

  return (
    <div>
      <ToolHeader
        title="文本对比"
        description="逐行比较两段文本或代码的差异，高亮新增、删除与修改行，支持忽略空白和大小写"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">文本输入</h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSample}
                  className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  加载示例
                </button>
                <button
                  type="button"
                  onClick={handleSwap}
                  className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  交换 A / B
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={bothEmpty}
                  className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  清空
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="diff-left"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    原始文本（A）
                  </label>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {leftText ? `${leftText.split('\n').length} 行` : '空'}
                  </span>
                </div>
                <textarea
                  id="diff-left"
                  value={leftText}
                  onChange={(event) => setLeftText(event.target.value)}
                  placeholder="在此输入或粘贴原始文本，支持直接粘贴"
                  spellCheck={false}
                  className="w-full h-52 p-3 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="diff-right"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    对比文本（B）
                  </label>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {rightText ? `${rightText.split('\n').length} 行` : '空'}
                  </span>
                </div>
                <textarea
                  id="diff-right"
                  value={rightText}
                  onChange={(event) => setRightText(event.target.value)}
                  placeholder="在此输入或粘贴对比文本，支持直接粘贴"
                  spellCheck={false}
                  className="w-full h-52 p-3 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 border-t border-gray-100 dark:border-gray-700 pt-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={ignoreWhitespace}
                  onChange={(event) => setIgnoreWhitespace(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                忽略空白差异
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={ignoreCase}
                  onChange={(event) => setIgnoreCase(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                />
                忽略大小写
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                对比在浏览器本地完成，文本不会上传
              </span>
            </div>
          </div>

          {result ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">对比结果</h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    新增 {result.added} 行
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    删除 {result.removed} 行
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    修改 {result.changed} 行
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    共 {result.rows.length} 行
                  </span>
                </div>
              </div>

              {result.truncated && (
                <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  文本过长，已退化为逐行比较，结果可能与精确差异略有出入。
                </p>
              )}

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-y-auto overflow-x-hidden max-h-[70vh]">
                <div className="sticky top-0 z-10 grid grid-cols-2 bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300">
                  <div className="px-3 py-2">原始文本（A）</div>
                  <div className="px-3 py-2 border-l border-gray-200 dark:border-gray-600">
                    对比文本（B）
                  </div>
                </div>
                {result.rows.map((row, index) => (
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
                行内内容过长时可左右滑动查看；红色为删除/修改前内容，绿色为新增/修改后内容。
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-10 text-center">
              <div className="text-4xl mb-3">🧾</div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                暂无对比结果
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {bothEmpty
                  ? '在上方左右两侧分别输入或粘贴文本，即可开始逐行对比。'
                  : '左右两侧都需要有内容才能开始对比，请补全另一侧文本。'}
              </p>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 对比按行进行，适合比较代码、配置、文档等纯文本内容。</p>
            <p>2. 勾选“忽略空白差异”后，行首行尾空格与连续空白不会计为差异。</p>
            <p>3. 全部计算在浏览器本地完成，文本不会上传到服务器。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
