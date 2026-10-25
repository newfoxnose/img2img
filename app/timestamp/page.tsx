'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Footer from '@/components/shared/Footer'

const features = ['秒/毫秒', '本地时区', 'UTC 时间', '双向转换', '实时更新']

/**
 * 补零
 */
function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(date: Date, utc = false): string {
  const get = utc ? date.getUTCSeconds.bind(date) : date.getSeconds.bind(date)
  const getM = utc ? date.getUTCMinutes.bind(date) : date.getMinutes.bind(date)
  const getH = utc ? date.getUTCHours.bind(date) : date.getHours.bind(date)
  const getD = utc ? date.getUTCDate.bind(date) : date.getDate.bind(date)
  const getMo = utc ? date.getUTCMonth.bind(date) : date.getMonth.bind(date)
  const getY = utc ? date.getUTCFullYear.bind(date) : date.getFullYear.bind(date)
  return `${getY()}-${pad(getMo() + 1)}-${pad(getD())} ${pad(getH())}:${pad(getM())}:${pad(get())}`
}

/**
 * 格式化 ISO 字符串
 */
function formatISO(date: Date): string {
  return date.toISOString()
}

/**
 * 复制文本到剪贴板
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 复制按钮
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [text])
  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors shrink-0"
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

/**
 * 结果行
 */
function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 shrink-0 w-20">{label}</span>
      <code className="flex-1 text-sm font-mono text-gray-900 break-all text-right">
        {value}
      </code>
      <CopyButton text={value} />
    </div>
  )
}

export default function TimestampPage() {
  const [now, setNow] = useState<number>(Date.now())
  const [tsInput, setTsInput] = useState('')
  const [dateInput, setDateInput] = useState('')

  // 实时更新当前时间戳
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const nowSeconds = Math.floor(now / 1000)
  const nowMs = now

  // 解析时间戳输入
  const tsResult = useMemo(() => {
    const trimmed = tsInput.trim()
    if (!trimmed) return null
    const num = Number(trimmed)
    if (isNaN(num)) return null
    // 自动判断单位：10 位为秒，13 位为毫秒
    const ms = trimmed.length <= 10 ? num * 1000 : num
    const date = new Date(ms)
    if (isNaN(date.getTime())) return null
    return {
      unit: trimmed.length <= 10 ? '秒' : '毫秒',
      local: formatDateTime(date),
      utc: formatDateTime(date, true),
      iso: formatISO(date),
      ms,
    }
  }, [tsInput])

  // 解析日期输入
  const dateResult = useMemo(() => {
    const trimmed = dateInput.trim()
    if (!trimmed) return null
    // 尝试解析
    let date: Date | null = null
    // 支持 YYYY-MM-DD HH:mm:ss 格式
    const normalized = trimmed.replace(/-/g, '/')
    date = new Date(normalized)
    if (isNaN(date.getTime())) {
      date = new Date(trimmed)
    }
    if (isNaN(date.getTime())) return null
    return {
      seconds: Math.floor(date.getTime() / 1000),
      ms: date.getTime(),
      local: formatDateTime(date),
      utc: formatDateTime(date, true),
    }
  }, [dateInput])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="container-responsive py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              时间戳转换
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Unix 时间戳与日期时间互转，自动识别秒或毫秒
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1 bg-gray-100 rounded-full"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="container-responsive py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 当前时间戳 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              当前时间戳
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">秒（10 位）</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xl font-mono text-blue-600">
                    {nowSeconds}
                  </code>
                  <CopyButton text={String(nowSeconds)} />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">毫秒（13 位）</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xl font-mono text-blue-600">
                    {nowMs}
                  </code>
                  <CopyButton text={String(nowMs)} />
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              当前时间：{formatDateTime(new Date(now))}
            </p>
          </div>

          {/* 时间戳转日期 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              时间戳 → 日期
            </h2>
            <input
              type="text"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder="输入时间戳，如 1700000000 或 1700000000000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
            />
            {tsResult ? (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">
                  识别单位：{tsResult.unit}
                </p>
                <ResultRow label="本地时间" value={tsResult.local} />
                <ResultRow label="UTC 时间" value={tsResult.utc} />
                <ResultRow label="ISO 格式" value={tsResult.iso} />
                <ResultRow label="毫秒时间戳" value={String(tsResult.ms)} />
              </div>
            ) : tsInput ? (
              <p className="mt-4 text-sm text-red-600">无效的时间戳</p>
            ) : null}
          </div>

          {/* 日期转时间戳 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              日期 → 时间戳
            </h2>
            <input
              type="text"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              placeholder="输入日期，如 2024-01-01 12:00:00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
            />
            {dateResult ? (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <ResultRow label="本地时间" value={dateResult.local} />
                <ResultRow label="UTC 时间" value={dateResult.utc} />
                <ResultRow label="秒时间戳" value={String(dateResult.seconds)} />
                <ResultRow label="毫秒时间戳" value={String(dateResult.ms)} />
              </div>
            ) : dateInput ? (
              <p className="mt-4 text-sm text-red-600">无效的日期格式</p>
            ) : null}
          </div>

          {/* 使用说明 */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">说明</h3>
            <div className="text-blue-800 text-sm space-y-2">
              <p>1. <strong>时间戳</strong>：自 1970-01-01 00:00:00 UTC 起经过的秒数或毫秒数。</p>
              <p>2. 输入 10 位数字自动按<strong>秒</strong>解析，输入 13 位数字自动按<strong>毫秒</strong>解析。</p>
              <p>3. 日期输入支持 <code className="bg-blue-100 px-1 rounded">YYYY-MM-DD HH:mm:ss</code>、<code className="bg-blue-100 px-1 rounded">YYYY/MM/DD</code> 等常见格式。</p>
              <p>4. 本地时间使用您设备所在时区，UTC 时间为世界协调时间。</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
