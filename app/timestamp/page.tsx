'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'
import Footer from '@/components/shared/Footer'
import {
  formatLocalDateTime,
  formatUtcDateTime,
  getTimeZoneRows,
  getNextCronRuns,
  parseCronExpression,
  parseDateTimeInput,
  parseTimestampInput,
  relativeTime,
  type CronParseResult,
  type CronRunResult,
} from '@/lib/time-tools'

const features = ['秒/毫秒', '多时区对照', '批量转换', 'Cron 解析', '相对时间']

const BATCH_SAMPLE = [
  '1700000000',
  '1700000000000',
  '2024-01-01 12:00:00',
  '2024/06/15',
].join('\n')

const CRON_SAMPLES = ['*/5 * * * *', '0 9 * * 1-5', '0 0 1 * *', '30 18 * * 5']

async function copyToClipboard(text: string): Promise<boolean> {
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
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [text])
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors shrink-0 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0 dark:border-gray-700">
      <span className="text-sm text-gray-500 shrink-0 w-24 dark:text-gray-400">{label}</span>
      <code className="flex-1 text-sm font-mono text-gray-900 break-all text-right dark:text-gray-100">
        {value}
      </code>
      <CopyButton text={value} />
    </div>
  )
}

/** 多时区对照面板 */
function TimeZonePanel({ ms }: { ms: number }) {
  const rows = useMemo(() => getTimeZoneRows(new Date(ms)), [ms])
  return (
    <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/40">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">多时区对照</p>
      {rows.map((row) => (
        <ResultRow key={row.timeZone} label={`${row.label}`} value={row.value} />
      ))}
    </div>
  )
}

interface BatchRow {
  input: string
  type: string
  ms: number | null
  local: string
  utc: string
  seconds: string
  msText: string
  error: string | null
}

function buildBatchRow(line: string): BatchRow {
  if (/^\d+$/.test(line)) {
    const parsed = parseTimestampInput(line)
    if (!parsed.ok) {
      return {
        input: line,
        type: '错误',
        ms: null,
        local: '',
        utc: '',
        seconds: '',
        msText: '',
        error: parsed.error || '无效的时间戳',
      }
    }
    const date = new Date(parsed.ms)
    return {
      input: line,
      type: parsed.unit === '秒' ? '秒时间戳' : '毫秒时间戳',
      ms: parsed.ms,
      local: formatLocalDateTime(date),
      utc: formatUtcDateTime(date),
      seconds: String(parsed.seconds),
      msText: String(parsed.ms),
      error: null,
    }
  }

  const parsedDate = parseDateTimeInput(line)
  if (!parsedDate.ok) {
    return {
      input: line,
      type: '错误',
      ms: null,
      local: '',
      utc: '',
      seconds: '',
      msText: '',
      error: parsedDate.error,
    }
  }

  const date = parsedDate.date
  const ms = date.getTime()
  return {
    input: line,
    type: '日期',
    ms,
    local: formatLocalDateTime(date),
    utc: formatUtcDateTime(date),
    seconds: String(Math.floor(ms / 1000)),
    msText: String(ms),
    error: null,
  }
}

export default function TimestampPage() {
  const [now, setNow] = useState<number | null>(null)
  const [tsInput, setTsInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [batchInput, setBatchInput] = useState('')
  const [batchRows, setBatchRows] = useState<BatchRow[]>([])
  const [cronInput, setCronInput] = useState('*/5 * * * *')
  const [cronResult, setCronResult] = useState<CronParseResult | null>(null)
  const [cronRuns, setCronRuns] = useState<CronRunResult | null>(null)
  const [localTimeZone, setLocalTimeZone] = useState('')

  // 实时更新当前时间戳（仅在客户端启动，避免 SSR 水合不一致）
  useEffect(() => {
    setNow(Date.now())
    setLocalTimeZone(
      Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区'
    )
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const tsResult = useMemo(() => {
    const trimmed = tsInput.trim()
    if (!trimmed) return null
    return parseTimestampInput(trimmed)
  }, [tsInput])

  const dateResult = useMemo(() => {
    const trimmed = dateInput.trim()
    if (!trimmed) return null
    return parseDateTimeInput(trimmed)
  }, [dateInput])

  // 批量转换（防抖，避免每次按键都全量解析）
  useEffect(() => {
    const timer = setTimeout(() => {
      const lines = batchInput
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
      setBatchRows(lines.map(buildBatchRow))
    }, 250)
    return () => clearTimeout(timer)
  }, [batchInput])

  // Cron 实时解析（防抖，计算在 effect 中完成）
  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = parseCronExpression(cronInput)
      setCronResult(parsed)
      if (parsed.ok) {
        setCronRuns(getNextCronRuns(parsed.cron, new Date(), 5))
      } else {
        setCronRuns(null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [cronInput])

  const nowMs = now ?? 0
  const nowSeconds = now === null ? 0 : Math.floor(now / 1000)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ToolHeader
        title="时间戳转换"
        description="Unix 时间戳与日期时间互转，支持多时区对照、批量转换、相对时间与 Cron 表达式解析"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 当前时间戳 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              当前时间戳
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-700/40">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">秒（10 位）</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xl font-mono text-blue-600 dark:text-blue-400">
                    {now === null ? '—' : nowSeconds}
                  </code>
                  {now !== null && <CopyButton text={String(nowSeconds)} />}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-700/40">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">毫秒（13 位）</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xl font-mono text-blue-600 dark:text-blue-400">
                    {now === null ? '—' : now}
                  </code>
                  {now !== null && <CopyButton text={String(now)} />}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              当前时间：{now === null ? '加载中…' : formatLocalDateTime(new Date(now))}
              {now !== null && `（${localTimeZone}）`}
            </p>
          </div>

          {/* 时间戳转日期 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              时间戳 → 日期
            </h2>
            <input
              type="text"
              value={tsInput}
              onChange={(e) => setTsInput(e.target.value)}
              placeholder="输入时间戳，如 1700000000 或 1700000000000"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white font-mono text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            {tsResult ? (
              tsResult.ok ? (
                <>
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/40">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      识别单位：{tsResult.unit}（{tsResult.length} 位数字）
                    </p>
                    <ResultRow label="本地时间" value={formatLocalDateTime(new Date(tsResult.ms))} />
                    <ResultRow label="UTC 时间" value={formatUtcDateTime(new Date(tsResult.ms))} />
                    <ResultRow label="ISO 格式" value={new Date(tsResult.ms).toISOString()} />
                    <ResultRow label="秒时间戳" value={String(tsResult.seconds)} />
                    <ResultRow label="毫秒时间戳" value={String(tsResult.ms)} />
                    <ResultRow label="相对时间" value={relativeTime(tsResult.ms, nowMs)} />
                  </div>
                  <TimeZonePanel ms={tsResult.ms} />
                </>
              ) : (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{tsResult.error}</p>
              )
            ) : null}
          </div>

          {/* 日期转时间戳 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              日期 → 时间戳
            </h2>
            <input
              type="text"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              placeholder="输入日期，如 2024-01-01 12:00:00"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white font-mono text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            {dateResult ? (
              dateResult.ok ? (
                <>
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/40">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      按本地时区（{localTimeZone || '本地'}）解析
                    </p>
                    <ResultRow label="本地时间" value={formatLocalDateTime(dateResult.date)} />
                    <ResultRow label="UTC 时间" value={formatUtcDateTime(dateResult.date)} />
                    <ResultRow
                      label="秒时间戳"
                      value={String(Math.floor(dateResult.date.getTime() / 1000))}
                    />
                    <ResultRow label="毫秒时间戳" value={String(dateResult.date.getTime())} />
                    <ResultRow label="相对时间" value={relativeTime(dateResult.date.getTime(), nowMs)} />
                  </div>
                  <TimeZonePanel ms={dateResult.date.getTime()} />
                </>
              ) : (
                <p className="mt-4 text-sm text-red-600 dark:text-red-400">{dateResult.error}</p>
              )
            ) : null}
          </div>

          {/* 批量转换 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">批量转换</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBatchInput(BATCH_SAMPLE)}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  填入示例
                </button>
                <button
                  type="button"
                  onClick={() => setBatchInput('')}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  清空
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              每行一个输入，自动识别 10 位秒 / 13 位毫秒时间戳，或 YYYY-MM-DD、YYYY/MM/DD、YYYY-MM-DD HH:mm:ss 日期
            </p>
            <textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={BATCH_SAMPLE}
              spellCheck={false}
              className="w-full h-32 p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm text-gray-900 resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            {batchRows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/60">
                    <tr>
                      {['输入', '类型', '本地时间', 'UTC', '秒', '毫秒', '相对时间', '复制'].map(
                        (title) => (
                          <th
                            key={title}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap dark:text-gray-400"
                          >
                            {title}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.map((row, index) => (
                      <tr
                        key={`${index}-${row.input}`}
                        className="border-t border-gray-100 dark:border-gray-700"
                      >
                        <td className="px-3 py-2 font-mono text-gray-900 break-all dark:text-gray-100">
                          {row.input}
                        </td>
                        <td
                          className={`px-3 py-2 whitespace-nowrap ${
                            row.error
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {row.type}
                        </td>
                        {row.error ? (
                          <td
                            colSpan={5}
                            className="px-3 py-2 text-red-600 dark:text-red-400"
                          >
                            {row.error}
                          </td>
                        ) : (
                          <>
                            <td className="px-3 py-2 font-mono whitespace-nowrap text-gray-900 dark:text-gray-100">
                              {row.local}
                            </td>
                            <td className="px-3 py-2 font-mono whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {row.utc}
                            </td>
                            <td className="px-3 py-2 font-mono whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {row.seconds}
                            </td>
                            <td className="px-3 py-2 font-mono whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {row.msText}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {row.ms === null ? '—' : relativeTime(row.ms, nowMs)}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2">
                          {row.error ? (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          ) : (
                            <CopyButton text={row.local} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cron 解析 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Cron 表达式解析
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              5 字段：分 时 日 月 周，支持 *、数字、a-b、*/n、a-b/n 与逗号列表；周字段 0 和 7 都表示周日
            </p>
            <input
              type="text"
              value={cronInput}
              onChange={(e) => setCronInput(e.target.value)}
              placeholder="如 */5 * * * *"
              spellCheck={false}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white font-mono text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {CRON_SAMPLES.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  onClick={() => setCronInput(sample)}
                  className="px-2.5 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 font-mono dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {sample}
                </button>
              ))}
            </div>

            {cronResult && (
              <>
                {cronResult.ok ? (
                  <>
                    <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-700/40">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">中文描述</p>
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {cronResult.cron.description}
                      </p>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        未来 5 次执行时间（{localTimeZone || '本地时区'}）
                      </p>
                      {cronRuns && cronRuns.runs.length > 0 ? (
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/40">
                          {cronRuns.runs.map((run, index) => (
                            <div
                              key={`${run.getTime()}-${index}`}
                              className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0 dark:border-gray-700"
                            >
                              <span className="text-sm text-gray-500 shrink-0 w-8 dark:text-gray-400">
                                #{index + 1}
                              </span>
                              <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                {formatLocalDateTime(run)}
                              </code>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {relativeTime(run.getTime(), nowMs)}
                              </span>
                              <CopyButton text={formatLocalDateTime(run)} />
                            </div>
                          ))}
                          {cronRuns.exceeded && cronRuns.runs.length < 5 && (
                            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                              未来两年内未找到更多执行时间
                            </p>
                          )}
                        </div>
                      ) : cronRuns && cronRuns.exceeded ? (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          未来两年内未找到执行时间
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">计算中…</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-red-600 dark:text-red-400">{cronResult.error}</p>
                )}
              </>
            )}
          </div>

          {/* 使用说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">说明</h3>
            <p>
              1. <strong>时间戳</strong>：自 1970-01-01 00:00:00 UTC 起经过的秒数或毫秒数；10 位及以内按秒、11-13 位按毫秒解析。
            </p>
            <p>
              2. <strong>本地时间</strong>使用设备所在时区，多时区对照固定展示 UTC、上海（Asia/Shanghai）、东京（Asia/Tokyo）、伦敦（Europe/London）、纽约（America/New_York）、洛杉矶（America/Los_Angeles）。
            </p>
            <p>
              3. 日期输入按正则解析后构造本地时间，避免不同浏览器对 <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">YYYY-MM-DD HH:mm:ss</code> 的兼容差异。
            </p>
            <p>
              4. <strong>Cron</strong> 仅支持 5 字段，未来执行时间从下一分钟开始按本地时区搜索，最多向后搜索两年。
            </p>
            <p>5. 所有转换与 Cron 计算均在浏览器本地完成，不会上传输入内容。</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
