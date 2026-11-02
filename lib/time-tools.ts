/**
 * 时间戳 / 日期 / Cron 相关纯函数工具
 * 不依赖任何外部库，可安全用于客户端与 SSR（不含浏览器 API）
 */

/** 多时区对照使用的时区列表 */
export const TIME_ZONES = [
  { id: 'UTC', label: 'UTC' },
  { id: 'Asia/Shanghai', label: '上海' },
  { id: 'Asia/Tokyo', label: '东京' },
  { id: 'Europe/London', label: '伦敦' },
  { id: 'America/New_York', label: '纽约' },
  { id: 'America/Los_Angeles', label: '洛杉矶' },
] as const

export type TimeZoneId = (typeof TIME_ZONES)[number]['id']

/** 补零 */
export function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

/**
 * 按指定时区格式化为 YYYY-MM-DD HH:mm:ss
 * 通过 formatToParts 拼装，避免不同环境的格式差异
 */
export function formatInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const map: { [key: string]: string } = {}
  parts.forEach((part) => {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  })

  // 部分实现会把 0 点输出为 24
  const hour = map.hour === '24' ? '00' : map.hour
  return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`
}

/** 本地时区 YYYY-MM-DD HH:mm:ss */
export function formatLocalDateTime(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
    date.getSeconds()
  )}`
}

/** UTC 时间 YYYY-MM-DD HH:mm:ss */
export function formatUtcDateTime(date: Date): string {
  return formatInTimeZone(date, 'UTC')
}

/** 多时区对照结果 */
export function getTimeZoneRows(
  date: Date
): Array<{ label: string; timeZone: string; value: string }> {
  return TIME_ZONES.map((zone) => ({
    label: zone.label,
    timeZone: zone.id,
    value: formatInTimeZone(date, zone.id),
  }))
}

export interface TimestampInputResult {
  ok: boolean
  ms: number
  seconds: number
  unit: '秒' | '毫秒'
  length: number
  error?: string
}

/**
 * 解析时间戳输入
 * 10 位及以内按秒，11-13 位按毫秒
 */
export function parseTimestampInput(input: string): TimestampInputResult {
  const value = input.trim()
  if (!value) {
    return { ok: false, ms: 0, seconds: 0, unit: '秒', length: 0, error: '请输入时间戳' }
  }
  if (!/^\d+$/.test(value)) {
    return {
      ok: false,
      ms: 0,
      seconds: 0,
      unit: '秒',
      length: value.length,
      error: '时间戳只能包含数字',
    }
  }
  if (value.length > 13) {
    return {
      ok: false,
      ms: 0,
      seconds: 0,
      unit: '毫秒',
      length: value.length,
      error: '时间戳位数过长（最多 13 位）',
    }
  }
  const num = Number(value)
  const unit: '秒' | '毫秒' = value.length <= 10 ? '秒' : '毫秒'
  const ms = unit === '秒' ? num * 1000 : num
  const date = new Date(ms)
  if (isNaN(date.getTime())) {
    return {
      ok: false,
      ms: 0,
      seconds: 0,
      unit,
      length: value.length,
      error: '时间戳超出可表示的日期范围',
    }
  }
  return { ok: true, ms, seconds: Math.floor(ms / 1000), unit, length: value.length }
}

export type ParseDateResult =
  | { ok: true; date: Date }
  | { ok: false; error: string }

/**
 * 明确解析日期字符串，避免 new Date('YYYY-MM-DD HH:mm:ss') 的浏览器差异
 * 支持：YYYY-MM-DD、YYYY/MM/DD、YYYY-MM-DD HH:mm、YYYY-MM-DD HH:mm:ss
 */
export function parseDateTimeInput(input: string): ParseDateResult {
  const value = input.trim()
  if (!value) return { ok: false, error: '请输入日期' }

  const match = value.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  )
  if (!match) {
    return {
      ok: false,
      error: '日期格式无效，支持 YYYY-MM-DD、YYYY/MM/DD、YYYY-MM-DD HH:mm:ss',
    }
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = match[4] ? Number(match[4]) : 0
  const minute = match[5] ? Number(match[5]) : 0
  const second = match[6] ? Number(match[6]) : 0

  if (month < 1 || month > 12) return { ok: false, error: '月份需在 1-12 之间' }
  if (day < 1 || day > 31) return { ok: false, error: '日期需在 1-31 之间' }
  if (hour < 0 || hour > 23) return { ok: false, error: '小时需在 0-23 之间' }
  if (minute < 0 || minute > 59) return { ok: false, error: '分钟需在 0-59 之间' }
  if (second < 0 || second > 59) return { ok: false, error: '秒需在 0-59 之间' }

  const date = new Date(year, month - 1, day, hour, minute, second, 0)
  // 校验溢出（如 2024-02-31 会被自动进位）
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { ok: false, error: '该日期不存在，请检查月份与天数' }
  }

  return { ok: true, date }
}

/**
 * 中文相对时间，如「3 分钟后」「2 天前」「刚刚」
 */
export function relativeTime(targetMs: number, nowMs: number): string {
  if (!isFinite(targetMs) || !isFinite(nowMs)) return '—'

  const diff = targetMs - nowMs
  const abs = Math.abs(diff)
  const future = diff > 0

  if (abs < 60 * 1000) return '刚刚'

  const suffix = future ? '后' : '前'
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day

  if (abs < hour) {
    return `${Math.floor(abs / minute)} 分钟${suffix}`
  }
  if (abs < day) {
    return `${Math.floor(abs / hour)} 小时${suffix}`
  }
  if (abs < month) {
    return `${Math.floor(abs / day)} 天${suffix}`
  }
  if (abs < year) {
    return `${Math.floor(abs / month)} 个月${suffix}`
  }
  return `${Math.floor(abs / year)} 年${suffix}`
}

/* ----------------------------- Cron 表达式 ----------------------------- */

export type CronFieldName = 'minute' | 'hour' | 'day' | 'month' | 'weekday'

export interface CronFieldSpec {
  raw: string
  values: number[]
  /** 整个字段是否为星号通配（含步长为 1 的等价写法） */
  wildcard: boolean
}

export interface CronFields {
  minute: CronFieldSpec
  hour: CronFieldSpec
  day: CronFieldSpec
  month: CronFieldSpec
  weekday: CronFieldSpec
}

export interface CronExpression {
  raw: string
  fields: CronFields
  description: string
}

export type CronParseResult =
  | { ok: true; cron: CronExpression }
  | { ok: false; error: string }

interface CronFieldParseResult {
  ok: boolean
  spec?: CronFieldSpec
  error?: string
}

function parseCronField(
  raw: string,
  min: number,
  max: number,
  label: string,
  normalize?: (value: number) => number
): CronFieldParseResult {
  const text = raw.trim()
  if (!text) return { ok: false, error: `${label}字段不能为空` }

  const collected = new Set<number>()
  const items = text.split(',')

  for (let i = 0; i < items.length; i++) {
    const item = items[i].trim()
    if (!item) return { ok: false, error: `${label}字段包含空项` }

    const match = item.match(/^(\*|\d+)(?:-(\d+))?(?:[/](\d+))?$/)
    if (!match) {
      return { ok: false, error: `${label}字段格式无效：${item}` }
    }

    const base = match[1]
    const rangeEnd = match[2]
    const stepText = match[3]

    let start: number
    let end: number

    if (base === '*') {
      if (rangeEnd !== undefined) {
        return { ok: false, error: `${label}字段格式无效：${item}` }
      }
      start = min
      end = max
    } else {
      start = Number(base)
      if (rangeEnd !== undefined) {
        end = Number(rangeEnd)
      } else if (stepText !== undefined) {
        // a/n 视为 a-max/n
        end = max
      } else {
        end = start
      }
    }

    const step = stepText ? Number(stepText) : 1
    if (!isFinite(step) || step <= 0) {
      return { ok: false, error: `${label}字段步长必须大于 0` }
    }
    if (start > end) {
      return { ok: false, error: `${label}字段起始值不能大于结束值：${item}` }
    }
    if (start < min || start > max || end < min || end > max) {
      return { ok: false, error: `${label}字段取值范围为 ${min}-${max}：${item}` }
    }

    for (let value = start; value <= end; value += step) {
      collected.add(normalize ? normalize(value) : value)
    }
  }

  const values = Array.from(collected).sort((a, b) => a - b)
  if (values.length === 0) {
    return { ok: false, error: `${label}字段没有有效的取值` }
  }

  const wildcard =
    text === '*' ||
    (values.length === max - min + 1 &&
      (text === '*/1' || /^\d+-\d+\/1$/.test(text) || /^\*\/1$/.test(text)))

  return { ok: true, spec: { raw: text, values, wildcard } }
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function formatCronTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`
}

function describeCron(fields: CronFields): string {
  const isWild = (spec: CronFieldSpec) => spec.wildcard
  const minute = fields.minute
  const hour = fields.hour
  const day = fields.day
  const month = fields.month
  const weekday = fields.weekday

  if (
    isWild(minute) &&
    isWild(hour) &&
    isWild(day) &&
    isWild(month) &&
    isWild(weekday)
  ) {
    return '每分钟'
  }

  const minuteStep = minute.raw.match(/^\*\/(\d+)$/)
  if (
    minuteStep &&
    isWild(hour) &&
    isWild(day) &&
    isWild(month) &&
    isWild(weekday)
  ) {
    return `每 ${Number(minuteStep[1])} 分钟`
  }

  if (
    isWild(hour) &&
    isWild(day) &&
    isWild(month) &&
    isWild(weekday) &&
    minute.values.length === 1
  ) {
    return minute.values[0] === 0 ? '每小时整点' : `每小时第 ${minute.values[0]} 分`
  }

  const hourStep = hour.raw.match(/^\*\/(\d+)$/)
  if (
    hourStep &&
    isWild(day) &&
    isWild(month) &&
    isWild(weekday) &&
    minute.values.length === 1
  ) {
    return `每 ${Number(hourStep[1])} 小时的第 ${minute.values[0]} 分`
  }

  if (minute.values.length !== 1 || hour.values.length !== 1) {
    return '自定义表达式'
  }

  const time = formatCronTime(hour.values[0], minute.values[0])

  // 每天 / 每周 / 每月 / 每年
  if (isWild(day) && isWild(month)) {
    if (isWild(weekday)) {
      return `每天 ${time}`
    }
    const weekdayValues = weekday.values
    const isWorkday =
      weekdayValues.length === 5 &&
      weekdayValues.every((value, index) => value === index + 1)
    if (isWorkday) return `工作日 ${time}`
    if (
      weekdayValues.length === 2 &&
      weekdayValues.indexOf(0) >= 0 &&
      weekdayValues.indexOf(6) >= 0
    ) {
      return `每周末 ${time}`
    }
    if (weekdayValues.length <= 4) {
      const names = weekdayValues.map((value) => WEEKDAY_LABELS[value] || '').join('、')
      return `每周${names} ${time}`
    }
    return '自定义表达式'
  }

  if (!isWild(day) && day.values.length === 1 && isWild(weekday)) {
    if (isWild(month)) {
      return `每月 ${day.values[0]} 日 ${time}`
    }
    if (month.values.length === 1) {
      return `每年 ${month.values[0]} 月 ${day.values[0]} 日 ${time}`
    }
    return '自定义表达式'
  }

  return '自定义表达式'
}

/**
 * 解析 5 字段 Cron：分 时 日 月 周
 * 周字段 0-7，0 与 7 都表示周日
 */
export function parseCronExpression(expression: string): CronParseResult {
  const raw = expression.trim()
  if (!raw) return { ok: false, error: '请输入 Cron 表达式' }

  const parts = raw.split(/\s+/)
  if (parts.length !== 5) {
    return {
      ok: false,
      error: `需要 5 个字段（分 时 日 月 周），当前为 ${parts.length} 个`,
    }
  }

  const minute = parseCronField(parts[0], 0, 59, '分')
  if (!minute.ok || !minute.spec) {
    return { ok: false, error: minute.error || '分字段无效' }
  }

  const hour = parseCronField(parts[1], 0, 23, '时')
  if (!hour.ok || !hour.spec) {
    return { ok: false, error: hour.error || '时字段无效' }
  }

  const day = parseCronField(parts[2], 1, 31, '日')
  if (!day.ok || !day.spec) {
    return { ok: false, error: day.error || '日字段无效' }
  }

  const month = parseCronField(parts[3], 1, 12, '月')
  if (!month.ok || !month.spec) {
    return { ok: false, error: month.error || '月字段无效' }
  }

  const weekday = parseCronField(parts[4], 0, 7, '周', (value) =>
    value === 7 ? 0 : value
  )
  if (!weekday.ok || !weekday.spec) {
    return { ok: false, error: weekday.error || '周字段无效' }
  }

  const fields: CronFields = {
    minute: minute.spec,
    hour: hour.spec,
    day: day.spec,
    month: month.spec,
    weekday: weekday.spec,
  }

  return {
    ok: true,
    cron: { raw, fields, description: describeCron(fields) },
  }
}

export interface CronRunResult {
  runs: Date[]
  exceeded: boolean
}

const MAX_ITERATIONS = 200000

/**
 * 计算未来若干次执行时间（本地时区），从下一分钟开始搜索
 * 上限两年，超限返回 exceeded = true
 */
export function getNextCronRuns(
  cron: CronExpression,
  from: Date,
  count = 5
): CronRunResult {
  const fields = cron.fields
  const runs: Date[] = []

  const start = new Date(from.getTime())
  start.setMilliseconds(0)
  start.setSeconds(0, 0)
  start.setMinutes(start.getMinutes() + 1)

  const limit = new Date(
    from.getFullYear() + 2,
    from.getMonth(),
    from.getDate(),
    from.getHours(),
    from.getMinutes(),
    from.getSeconds(),
    0
  ).getTime()

  let candidate = start
  let iterations = 0
  let exceeded = false

  const dayRestricted = !fields.day.wildcard
  const weekdayRestricted = !fields.weekday.wildcard

  while (runs.length < count && candidate.getTime() <= limit) {
    iterations++
    if (iterations > MAX_ITERATIONS) {
      exceeded = true
      break
    }

    const year = candidate.getFullYear()
    const month = candidate.getMonth()
    const day = candidate.getDate()
    const hour = candidate.getHours()
    const minute = candidate.getMinutes()

    if (fields.month.values.indexOf(month + 1) < 0) {
      candidate = new Date(year, month + 1, 1, 0, 0, 0, 0)
      continue
    }

    const dayMatch = fields.day.values.indexOf(day) >= 0
    const weekdayMatch = fields.weekday.values.indexOf(candidate.getDay()) >= 0
    // 日与周同时受限时按 cron 传统语义取并集
    const dayOk =
      dayRestricted && weekdayRestricted ? dayMatch || weekdayMatch : dayMatch && weekdayMatch

    if (!dayOk) {
      candidate = new Date(year, month, day + 1, 0, 0, 0, 0)
      continue
    }

    if (fields.hour.values.indexOf(hour) < 0) {
      candidate = new Date(year, month, day, hour + 1, 0, 0, 0)
      continue
    }

    if (fields.minute.values.indexOf(minute) < 0) {
      candidate = new Date(year, month, day, hour, minute + 1, 0, 0)
      continue
    }

    runs.push(new Date(candidate.getTime()))
    candidate = new Date(year, month, day, hour, minute + 1, 0, 0)
  }

  if (runs.length < count) exceeded = true

  return { runs, exceeded }
}
