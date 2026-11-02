'use client'

/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['文本编解码', 'URL-Safe', '文件转 Base64', '图片预览', '本地处理']

type Mode = 'text' | 'file'
type Direction = 'encode' | 'decode'

interface FileResult {
  base64: string
  dataUrl: string
}

const MAX_DISPLAY_LENGTH = 100000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = Array.from(bytes.subarray(i, i + chunkSize))
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

function binaryToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function normalizeBase64(value: string): string {
  let base64 = value.trim()
  const dataUrlMatch = base64.match(/^data:[^,]*,/i)
  if (dataUrlMatch) {
    base64 = base64.slice(dataUrlMatch[0].length)
  }
  base64 = base64.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const remainder = base64.length % 4
  if (remainder === 1) {
    throw new Error('Base64 长度不合法')
  }
  if (remainder > 1) {
    base64 += '='.repeat(4 - remainder)
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('包含非法的 Base64 字符')
  }
  return base64
}

function encodeText(text: string, urlSafe: boolean): string {
  const base64 = bytesToBase64(new TextEncoder().encode(text))
  if (!urlSafe) return base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeText(value: string): string {
  const base64 = normalizeBase64(value)
  let binary: string
  try {
    binary = atob(base64)
  } catch {
    throw new Error('Base64 内容格式不正确，无法解码')
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(binaryToBytes(binary))
  } catch {
    throw new Error('解码结果不是有效的 UTF-8 文本，可能为二进制数据')
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!text) return
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
      disabled={!text}
      className="shrink-0 px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
    >
      {copied ? '已复制' : label}
    </button>
  )
}

export default function Base64Page() {
  const [mode, setMode] = useState<Mode>('text')
  const [direction, setDirection] = useState<Direction>('encode')
  const [urlSafe, setUrlSafe] = useState(false)
  const [input, setInput] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [fileResult, setFileResult] = useState<FileResult | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const readerRef = useRef<FileReader | null>(null)

  const textResult = useMemo<{ value: string; error: string }>(() => {
    if (!input) return { value: '', error: '' }
    try {
      return {
        value:
          direction === 'encode' ? encodeText(input, urlSafe) : decodeText(input),
        error: '',
      }
    } catch (err) {
      return {
        value: '',
        error: err instanceof Error ? err.message : '转换失败，请检查输入内容',
      }
    }
  }, [input, direction, urlSafe])

  const isImage = Boolean(file && file.type.startsWith('image/'))
  const isLargeFile = Boolean(file && file.size > 20 * 1024 * 1024)
  const displayBase64 = fileResult
    ? fileResult.base64.length > MAX_DISPLAY_LENGTH
      ? `${fileResult.base64.slice(0, MAX_DISPLAY_LENGTH)}\n…（仅展示前 10 万字符，复制或下载可获取完整内容）`
      : fileResult.base64
    : ''

  const handleFile = (next: File | null) => {
    if (!next) return
    readerRef.current?.abort()
    setFile(next)
    setFileResult(null)
    setFileError('')
    setFileLoading(true)

    const reader = new FileReader()
    readerRef.current = reader
    reader.onload = () => {
      if (readerRef.current !== reader) return
      const result = typeof reader.result === 'string' ? reader.result : ''
      const commaIndex = result.indexOf(',')
      const base64 = commaIndex >= 0 ? result.slice(commaIndex + 1) : result
      setFileResult({ base64, dataUrl: result })
      setFileLoading(false)
      readerRef.current = null
    }
    reader.onerror = () => {
      if (readerRef.current !== reader) return
      setFileError('文件读取失败，请重试或选择其他文件')
      setFileLoading(false)
      readerRef.current = null
    }
    reader.readAsDataURL(next)
  }

  const removeFile = () => {
    readerRef.current?.abort()
    readerRef.current = null
    setFile(null)
    setFileResult(null)
    setFileError('')
    setFileLoading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDownload = () => {
    if (!file || !fileResult) return
    const blob = new Blob([fileResult.base64], { type: 'text/plain;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `${file.name}.base64.txt`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  return (
    <div>
      <ToolHeader
        title="Base64 编解码"
        description="文本与文件的 Base64 编码/解码，支持中文、emoji、URL-Safe 与图片预览，全部在浏览器本地完成"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 模式切换 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                {[
                  { key: 'text', label: '文本模式' },
                  { key: 'file', label: '文件模式' },
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

              {mode === 'text' && (
                <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={urlSafe}
                    onChange={(event) => setUrlSafe(event.target.checked)}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  URL-Safe（+ → -，/ → _，去掉末尾 =）
                </label>
              )}
            </div>
          </div>

          {mode === 'text' ? (
            <>
              {/* 输入 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                    {[
                      { key: 'encode', label: '编码：文本 → Base64' },
                      { key: 'decode', label: '解码：Base64 → 文本' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setDirection(item.key as Direction)}
                        className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                          direction === item.key
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
                    onClick={() => setInput('')}
                    className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    清空
                  </button>
                </div>

                <div>
                  <label
                    htmlFor="base64-input"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {direction === 'encode' ? '输入要编码的文本（UTF-8）' : '输入要解码的 Base64'}
                  </label>
                  <textarea
                    id="base64-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      direction === 'encode'
                        ? '输入文本，支持中文与 emoji，例如：你好 😀'
                        : '粘贴 Base64，支持 data URL 前缀、换行与 URL-Safe 格式'
                    }
                    spellCheck={false}
                    className="w-full h-40 p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {direction === 'encode'
                      ? '按 UTF-8 编码，中文与 emoji 均可正确转换。'
                      : '解码时会自动去除空白、识别 data:{...};base64, 前缀，并还原 URL-Safe 字符。'}
                  </p>
                </div>
              </div>

              {/* 输出 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {direction === 'encode' ? '编码结果' : '解码结果'}
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
            </>
          ) : (
            <>
              {/* 文件选择 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="点击选择或拖拽文件"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragging(false)
                    handleFile(event.dataTransfer.files[0] ?? null)
                  }}
                  className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                    dragging
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 bg-gray-50 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700/40'
                  }`}
                >
                  <div className="text-3xl mb-2">📁</div>
                  <p className="text-gray-700 dark:text-gray-200 font-medium">
                    点击选择或拖拽文件到这里
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    支持图片、文本与任意文件，文件仅在浏览器本地读取，不会上传
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  aria-label="选择需要转换为 Base64 的文件"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
                />
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  提示：超过 20MB 的文件仍可转换，但读取与展示可能较慢；大文件结果会截断展示，复制与下载为完整内容。
                </p>
              </div>

              {/* 文件结果 */}
              {file && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white break-all">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatSize(file.size)} · {file.type || '未知 MIME 类型'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                      移除文件
                    </button>
                  </div>

                  {isLargeFile && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      该文件超过 20MB，转换可能占用较多内存，请耐心等待。
                    </p>
                  )}

                  {fileLoading && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">正在读取文件...</p>
                  )}

                  {fileError && (
                    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                      {fileError}
                    </p>
                  )}

                  {!fileLoading && fileResult && (
                    <>
                      {isImage && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            图片预览
                          </p>
                          <img
                            src={fileResult.dataUrl}
                            alt={`${file.name} 预览`}
                            className="max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-700"
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Base64 结果
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <CopyButton text={fileResult.base64} label="复制 Base64" />
                            <CopyButton text={fileResult.dataUrl} label="复制 Data URL" />
                            <button
                              type="button"
                              onClick={handleDownload}
                              className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                            >
                              下载 .txt
                            </button>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
                          <code className="font-mono text-sm break-all whitespace-pre-wrap text-gray-800 dark:text-gray-100">
                            {displayBase64 || '（空文件，Base64 结果为空）'}
                          </code>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 break-all">
                          Data URL 前缀：data:{file.type || 'application/octet-stream'};base64,
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* 说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 文本编码按 UTF-8 处理，中文与 emoji 的结果与标准 Base64 一致。</p>
            <p>2. 解码兼容标准 Base64、URL-Safe（- 与 _）以及 data URL 前缀，并自动忽略换行与空格。</p>
            <p>3. 所有数据只在浏览器本地处理，不会上传到服务器，也不会写入 URL。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
