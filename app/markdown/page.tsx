'use client'

import { useCallback, useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['实时预览', 'GFM 语法', 'HTML 导出', '本地处理']

const SAMPLE = `# Markdown 预览

## 常用语法示例

这是一段包含 **加粗**、*斜体*、~~删除线~~ 与 \`行内代码\` 的文本。

> 引用块：支持多行引用内容。
> 第二行引用。

### 列表

- 无序列表项一
- 无序列表项二
  - 嵌套列表项

1. 有序列表第一项
2. 有序列表第二项

### 任务列表

- [x] 已完成的任务
- [ ] 待完成的任务

### 表格

| 功能 | 支持情况 |
| --- | --- |
| 表格 | 支持 |
| 代码块 | 支持 |
| 任务列表 | 支持 |

### 代码块

\`\`\`js
function greet(name) {
  return 'Hello, ' + name
}
\`\`\`

[访问示例链接](https://example.com)

---
`

const previewClass = [
  'prose prose-sm max-w-none break-words text-gray-800 dark:text-gray-100',
  '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2',
  '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2',
  '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
  '[&_p]:my-3 [&_p]:leading-7',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-3',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-3',
  '[&_li]:my-1',
  '[&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm dark:[&_code]:bg-gray-700',
  '[&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-4 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:my-3',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit',
  '[&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm',
  '[&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:bg-gray-100 dark:[&_th]:border-gray-600 dark:[&_th]:bg-gray-700',
  '[&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-1.5 dark:[&_td]:border-gray-600',
  '[&_a]:text-blue-600 [&_a]:underline dark:[&_a]:text-blue-400',
  '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-600 [&_blockquote]:italic [&_blockquote]:my-3 dark:[&_blockquote]:border-gray-600 dark:[&_blockquote]:text-gray-400',
  '[&_img]:max-w-full [&_img]:rounded',
  '[&_hr]:my-4 [&_hr]:border-gray-200 dark:[&_hr]:border-gray-700',
  '[&_strong]:font-semibold [&_input]:mr-1',
].join(' ')

const EXPORT_STYLE = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; line-height: 1.7; color: #1f2937; max-width: 860px; margin: 0 auto; padding: 32px 20px; }
  h1, h2, h3 { line-height: 1.3; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: Consolas, Monaco, monospace; font-size: 90%; }
  pre { background: #111827; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; color: inherit; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
  th { background: #f3f4f6; }
  blockquote { border-left: 4px solid #d1d5db; margin: 16px 0; padding-left: 12px; color: #4b5563; }
  img { max-width: 100%; border-radius: 6px; }
  a { color: #2563eb; }
`

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function countChars(text: string): number {
  const plain = text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/[>*_~|]/g, '')
    .replace(/\s+/g, '')
  return plain.length
}

function CopyButton({
  text,
  label = '复制',
  disabled = false,
  className = '',
}: {
  text: string
  label?: string
  disabled?: boolean
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (disabled) return
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [disabled, text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className={`px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 ${className}`}
    >
      {copied ? '已复制' : label}
    </button>
  )
}

export default function MarkdownPage() {
  const [text, setText] = useState('')
  const [exported, setExported] = useState(false)

  const html = useMemo(() => {
    if (!text.trim()) return ''
    const raw = marked(text, { gfm: true, breaks: true, async: false })
    if (typeof window === 'undefined') return ''
    try {
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
    } catch {
      return ''
    }
  }, [text])

  const chars = useMemo(() => countChars(text), [text])

  const handleDownload = useCallback(() => {
    if (typeof window === 'undefined') return
    const documentHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Markdown 导出</title>
<style>${EXPORT_STYLE}</style>
</head>
<body>
${html}
</body>
</html>`
    const blob = new Blob([documentHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'markdown-preview.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 1500)
  }, [html])

  return (
    <div>
      <ToolHeader
        title="Markdown 预览"
        description="在浏览器中实时编辑并预览 Markdown，支持表格、代码块与任务列表，可复制或下载 HTML"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* 工具栏 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
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
                <CopyButton text={html} label="复制 HTML" disabled={!html} />
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!html}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {exported ? '已导出' : '下载 .html'}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                约 {chars} 字（不含空白与 Markdown 符号）
              </p>
            </div>
          </div>

          {/* 编辑与预览 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="markdown-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Markdown 输入
                </label>
                <span className="text-xs text-gray-400 dark:text-gray-500">{text.length} 字符</span>
              </div>
              <textarea
                id="markdown-input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="在这里输入 Markdown，左侧编辑、右侧实时预览"
                spellCheck={false}
                className="w-full h-[520px] p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">实时预览</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">已清洗 HTML</span>
              </div>
              <div className="h-[520px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                {html ? (
                  <div className={previewClass} dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-gray-400 dark:text-gray-500">
                    输入为空，在左侧输入 Markdown 后这里会实时显示预览
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 使用 marked 解析 GFM 语法（表格、代码块、任务列表），并经 DOMPurify 清洗后渲染，避免 XSS。</p>
            <p>2. 所有内容仅在浏览器本地处理，不会上传；导出 HTML 会内嵌基础样式，可直接在浏览器打开。</p>
            <p>3. 复制/下载的是清洗后的 HTML 片段，适合粘贴到支持 HTML 的编辑器中。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
