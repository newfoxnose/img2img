'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'
import { HASH_ALGORITHMS, hashBytes, hashFile, type HashAlgorithm } from '@/utils/hash'

const features = ['MD5/SHA/HMAC', '文本批量', '文件拖拽', '本地处理']

interface HashResult {
  text: string
  hash: string
}

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
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 px-2.5 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function HashPage() {
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('MD5')
  const [uppercase, setUppercase] = useState(false)
  const [hmacEnabled, setHmacEnabled] = useState(false)
  const [hmacKey, setHmacKey] = useState('')
  const [text, setText] = useState('')
  const [results, setResults] = useState<HashResult[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [fileHash, setFileHash] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hmacInvalid = hmacEnabled && algorithm === 'MD5'

  // 文本批量计算
  useEffect(() => {
    if (mode !== 'text') return
    if (!text) {
      setResults([])
      setError('')
      return
    }
    if (hmacInvalid) {
      setResults([])
      setError('Web Crypto 不支持 HMAC-MD5，请选择 SHA-1 / SHA-256 / SHA-512')
      return
    }

    let canceled = false
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const lines = text.split('\n')
        const computed = await Promise.all(
          lines.map(async (line) => ({
            text: line,
            hash: await hashBytes(
              new TextEncoder().encode(line),
              algorithm,
              hmacEnabled ? hmacKey : undefined
            ),
          }))
        )
        if (!canceled) {
          setResults(computed)
          setError('')
        }
      } catch (err) {
        if (!canceled) {
          setResults([])
          setError(err instanceof Error ? err.message : '计算失败')
        }
      } finally {
        if (!canceled) setLoading(false)
      }
    }, 250)

    return () => {
      canceled = true
      clearTimeout(timer)
    }
  }, [mode, text, algorithm, hmacEnabled, hmacKey, hmacInvalid])

  // 文件哈希
  useEffect(() => {
    if (mode !== 'file' || !file) return
    if (hmacInvalid) {
      setFileHash('')
      setError('Web Crypto 不支持 HMAC-MD5，请选择 SHA-1 / SHA-256 / SHA-512')
      return
    }

    let canceled = false
    setLoading(true)
    hashFile(file, algorithm, hmacEnabled ? hmacKey : undefined)
      .then((value) => {
        if (!canceled) {
          setFileHash(value)
          setError('')
        }
      })
      .catch((err) => {
        if (!canceled) {
          setFileHash('')
          setError(err instanceof Error ? err.message : '计算失败')
        }
      })
      .finally(() => {
        if (!canceled) setLoading(false)
      })

    return () => {
      canceled = true
    }
  }, [mode, file, algorithm, hmacEnabled, hmacKey, hmacInvalid])

  const handleFiles = (files: FileList | null) => {
    const next = files?.[0]
    if (next) {
      setFile(next)
      setFileHash('')
      setError('')
    }
  }

  return (
    <div>
      <ToolHeader
        title="哈希计算"
        description="支持 MD5、SHA-1、SHA-256、SHA-512 与 HMAC，可对文本批量或文件计算哈希值"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 模式与算法 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                {[
                  { key: 'text', label: '文本计算' },
                  { key: 'file', label: '文件计算' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMode(item.key as 'text' | 'file')}
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

              <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={uppercase}
                  onChange={(event) => setUppercase(event.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                大写输出
              </label>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">哈希算法</p>
              <div className="flex flex-wrap gap-2">
                {HASH_ALGORITHMS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAlgorithm(item)}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      algorithm === item
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={hmacEnabled}
                  onChange={(event) => setHmacEnabled(event.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                使用 HMAC（需要密钥）
              </label>
              {hmacEnabled && (
                <input
                  type="password"
                  value={hmacKey}
                  onChange={(event) => setHmacKey(event.target.value)}
                  placeholder="输入 HMAC 密钥"
                  className="mt-3 w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              )}
              {hmacInvalid && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  MD5 不支持 HMAC，请选择 SHA 系列算法。
                </p>
              )}
            </div>
          </div>

          {/* 输入区 */}
          {mode === 'text' ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <label htmlFor="hash-input" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  输入文本（每行单独计算，支持批量）
                </label>
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  清空
                </button>
              </div>
              <textarea
                id="hash-input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="输入要计算哈希的文本，多行文本将按行分别计算"
                className="w-full h-40 p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                spellCheck={false}
              />
              {loading && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">计算中...</p>}
              {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(false)
                  handleFiles(event.dataTransfer.files)
                }}
                className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 bg-gray-50 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700/40'
                }`}
              >
                <div className="text-3xl mb-2">📁</div>
                <p className="text-gray-700 dark:text-gray-200 font-medium">点击选择或拖拽文件到这里</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  文件仅在浏览器本地读取，不会上传
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />

              {file && (
                <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null)
                        setFileHash('')
                        setError('')
                      }}
                      className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                    >
                      移除
                    </button>
                  </div>
                  {loading ? (
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">计算中...</p>
                  ) : fileHash ? (
                    <div className="mt-3 flex items-start gap-2">
                      <code className="flex-1 text-sm font-mono break-all text-gray-800 dark:text-gray-100">
                        {uppercase ? fileHash.toUpperCase() : fileHash}
                      </code>
                      <CopyButton text={uppercase ? fileHash.toUpperCase() : fileHash} />
                    </div>
                  ) : null}
                  {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
                </div>
              )}
            </div>
          )}

          {/* 文本结果 */}
          {mode === 'text' && results.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  计算结果（{results.length} 行）
                </h2>
                <CopyButton
                  text={results
                    .map((item) => (uppercase ? item.hash.toUpperCase() : item.hash))
                    .join('\n')}
                />
              </div>
              <div className="space-y-2">
                {results.map((item, index) => {
                  const hash = uppercase ? item.hash.toUpperCase() : item.hash
                  return (
                    <div
                      key={`${index}-${hash}`}
                      className="rounded-lg border border-gray-100 dark:border-gray-700 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                          {item.text || '(空行)'}
                        </p>
                        <CopyButton text={hash} />
                      </div>
                      <code className="block mt-2 text-sm font-mono break-all text-gray-800 dark:text-gray-100">
                        {hash}
                      </code>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. MD5 按 UTF-8 编码计算，中文结果与 PHP / 命令行标准结果一致。</p>
            <p>2. SHA 系列与 HMAC 使用浏览器 Web Crypto，需要在 HTTPS 或 localhost 环境下运行。</p>
            <p>3. 文本模式按行拆分，每行单独计算；空行也会生成对应哈希。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
