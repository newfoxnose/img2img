'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['日期差', '年月日分解', '日期加减', '时间戳']

type AddUnit = 'day' | 'week' | 'month' | 'year'

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const ADD_UNITS: { key: AddUnit; label: string }[] = [
  { key: 'day', label: '天' },
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
]

function pad2(value: number): string {
  return value < 10 ? `0${value}` : String(value)
}

function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`
}

function formatLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

function weekday(date: Date): string {
  return WEEKDAYS[date.getDay()]
}

function parseDateInput(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function todayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** 加月份并在目标月末做 clamp，避免 1/31 + 1 月变成 3/3 */
function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const day = result.getDate()
  result.setDate(1)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(day, lastDay))
  return result
}

function decompose(start: Date, end: Date): {
  years: number
  months: number
  days: number
  hours: number
  minutes: number
} {
  let years = 0
  while (years < 5000 && addMonthsClamped(start, (years + 1) * 12).getTime() <= end.getTime()) {
    years++
  }

  let months = 0
  while (months < 12 && addMonthsClamped(start, years * 12 + months + 1).getTime() <= end.getTime()) {
    months++
  }

  const cursor = addMonthsClamped(start, years * 12 + months)
  const remainMs = Math.max(0, end.getTime() - cursor.getTime())
  const days = Math.floor(remainMs / 86400000)
  const hours = Math.floor((remainMs % 86400000) / 3600000)
  const minutes = Math.floor((remainMs % 3600000) / 60000)
  return { years, months, days, hours, minutes }
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return ''
  const cleaned = Number(value.toPrecision(10))
  if (Object.is(cleaned, -0)) return '0'
  return String(cleaned)
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
      className="shrink-0 px-3 py-1 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">{label}</span>
      <span className="flex items-start gap-2 min-w-0">
        <span className="font-mono text-sm text-gray-900 dark:text-white break-all text-right">{value}</span>
        <CopyButton text={value} />
      </span>
    </div>
  )
}

export default function DateCalcPage() {
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const [addBase, setAddBase] = useState('')
  const [addAmount, setAddAmount] = useState('7')
  const [addUnit, setAddUnit] = useState<AddUnit>('day')

  const [timeZone, setTimeZone] = useState('')

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || '本地时区')
  }, [])

  const invalidStart = start !== '' && !parseDateInput(start)
  const invalidEnd = end !== '' && !parseDateInput(end)
  const invalidAddBase = addBase !== '' && !parseDateInput(addBase)

  const addAmountTrimmed = addAmount.trim()
  const addAmountNumber = Number(addAmountTrimmed)
  const invalidAddAmount =
    addAmountTrimmed !== '' && (!Number.isFinite(addAmountNumber) || !Number.isInteger(addAmountNumber))

  const diff = useMemo(() => {
    if (invalidStart || invalidEnd) return null
    const a = parseDateInput(start) ?? todayStart()
    const b = parseDateInput(end) ?? todayStart()
    const diffMs = Math.abs(b.getTime() - a.getTime())
    const earlier = a.getTime() <= b.getTime() ? a : b
    const later = a.getTime() <= b.getTime() ? b : a
    const parts = decompose(earlier, later)

    return {
      a,
      b,
      same: diffMs === 0,
      aFirst: a.getTime() <= b.getTime(),
      totalDays: diffMs / 86400000,
      totalHours: diffMs / 3600000,
      totalMinutes: diffMs / 60000,
      totalSeconds: diffMs / 1000,
      parts,
    }
  }, [start, end, invalidStart, invalidEnd])

  const addResult = useMemo(() => {
    if (addAmountTrimmed === '' || invalidAddAmount) return null
    const base = parseDateInput(addBase) ?? todayStart()
    let result = new Date(base.getTime())
    switch (addUnit) {
      case 'day': {
        result.setDate(result.getDate() + addAmountNumber)
        break
      }
      case 'week': {
        result.setDate(result.getDate() + addAmountNumber * 7)
        break
      }
      case 'month': {
        result = addMonthsClamped(base, addAmountNumber)
        break
      }
      case 'year': {
        result = addMonthsClamped(base, addAmountNumber * 12)
        break
      }
    }
    return { base, result }
  }, [addBase, addAmountTrimmed, addAmountNumber, addUnit, invalidAddAmount])

  const setNow = (setter: (value: string) => void) => setter(toInputValue(new Date()))
  const setToday = (setter: (value: string) => void) => setter(toInputValue(todayStart()))

  return (
    <div>
      <ToolHeader
        title="日期计算"
        description="计算两个日期的时间间隔与日期加减，支持年月日分解、星期显示、时区说明和结果复制"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* 日期差输入 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">日期差计算</h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {timeZone ? `本地时区：${timeZone}` : '使用浏览器本地时区'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="diff-start" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    日期 A
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNow(setStart)}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      现在
                    </button>
                    <button
                      type="button"
                      onClick={() => setToday(setStart)}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      今天
                    </button>
                  </div>
                </div>
                <input
                  id="diff-start"
                  type="datetime-local"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="diff-end" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    日期 B
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNow(setEnd)}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      现在
                    </button>
                    <button
                      type="button"
                      onClick={() => setToday(setEnd)}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      今天
                    </button>
                  </div>
                </div>
                <input
                  id="diff-end"
                  type="datetime-local"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              留空时按当天 00:00 处理；日期使用浏览器本地时区。
            </p>
            {(invalidStart || invalidEnd) && (
              <p className="text-sm text-red-600 dark:text-red-400">日期格式无效，请重新选择。</p>
            )}
          </div>

          {/* 日期差结果 */}
          {diff && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">间隔结果</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {diff.same ? '两个时间相同' : diff.aFirst ? 'A 早于 B' : 'B 早于 A'}
                </span>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 mb-4 dark:bg-gray-700/40">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">按日历推进分解</p>
                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  {diff.parts.years} 年 {diff.parts.months} 月 {diff.parts.days} 天 {diff.parts.hours} 小时{' '}
                  {diff.parts.minutes} 分钟
                </p>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <OutputRow label="A" value={`${formatLocal(diff.a)} ${weekday(diff.a)}`} />
                <OutputRow label="B" value={`${formatLocal(diff.b)} ${weekday(diff.b)}`} />
                <OutputRow label="总天数（含小数）" value={formatNumber(diff.totalDays)} />
                <OutputRow label="总小时" value={formatNumber(diff.totalHours)} />
                <OutputRow label="总分钟" value={formatNumber(diff.totalMinutes)} />
                <OutputRow label="总秒数" value={formatNumber(diff.totalSeconds)} />
              </div>
            </div>
          )}

          {/* 日期加减 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">日期加减</h2>

            <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr] gap-4 md:items-end">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="add-base" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    基准日期
                  </label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNow(setAddBase)}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      现在
                    </button>
                    <button
                      type="button"
                      onClick={() => setToday(setAddBase)}
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      今天
                    </button>
                  </div>
                </div>
                <input
                  id="add-base"
                  type="datetime-local"
                  value={addBase}
                  onChange={(event) => setAddBase(event.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="add-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  数值（整数）
                </label>
                <input
                  id="add-amount"
                  type="text"
                  inputMode="numeric"
                  value={addAmount}
                  onChange={(event) => setAddAmount(event.target.value)}
                  placeholder="例如 7，负数表示往前"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="add-unit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  单位
                </label>
                <select
                  id="add-unit"
                  value={addUnit}
                  onChange={(event) => setAddUnit(event.target.value as AddUnit)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {ADD_UNITS.map((unit) => (
                    <option key={unit.key} value={unit.key}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              基准日期留空时按当天 00:00 处理；按月份/年份加法遇到月末会自动 clamp（如 1 月 31 日 + 1 个月 = 2 月最后一天）。
            </p>
            {invalidAddBase && (
              <p className="text-sm text-red-600 dark:text-red-400">基准日期格式无效，请重新选择。</p>
            )}
            {invalidAddAmount && (
              <p className="text-sm text-red-600 dark:text-red-400">请输入有效的整数（可为负数）。</p>
            )}
            {addAmountTrimmed === '' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">请输入要加减的数值。</p>
            )}

            {addResult && (
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/40">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">计算结果</p>
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-400 break-all">
                  {formatLocal(addResult.result)} {weekday(addResult.result)}
                </p>
              </div>
            )}
          </div>

          {/* 输出格式 */}
          {addResult && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">结果格式</h2>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <OutputRow label="本地时间" value={formatLocal(addResult.result)} />
                <OutputRow label="ISO 8601" value={addResult.result.toISOString()} />
                <OutputRow label="秒时间戳" value={String(Math.floor(addResult.result.getTime() / 1000))} />
                <OutputRow label="毫秒时间戳" value={String(addResult.result.getTime())} />
                <OutputRow label="星期" value={weekday(addResult.result)} />
              </div>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 所有日期均使用浏览器本地时区计算，显示的时间为本地时间。</p>
            <p>2. 年月日分解按日历逐月推进，不使用 365 天近似，因此能正确处理闰年与月末。</p>
            <p>3. 月份/年份加减会在目标月最后一天做 clamp，避免出现 3 月 3 日这类溢出。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
