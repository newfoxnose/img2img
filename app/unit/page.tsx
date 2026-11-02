'use client'

import { useCallback, useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['6 大类单位', '温度公式换算', '全单位对照', '点击复制']

type CategoryKey = 'length' | 'area' | 'weight' | 'temperature' | 'data' | 'time'

interface UnitDef {
  key: string
  label: string
  factor: number
}

interface CategoryDef {
  key: CategoryKey
  label: string
  defaultFrom: string
  defaultTo: string
  units: UnitDef[]
  note?: string
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'length',
    label: '长度',
    defaultFrom: 'm',
    defaultTo: 'km',
    units: [
      { key: 'mm', label: '毫米 (mm)', factor: 0.001 },
      { key: 'cm', label: '厘米 (cm)', factor: 0.01 },
      { key: 'm', label: '米 (m)', factor: 1 },
      { key: 'km', label: '千米 (km)', factor: 1000 },
      { key: 'inch', label: '英寸 (inch)', factor: 0.0254 },
      { key: 'foot', label: '英尺 (foot)', factor: 0.3048 },
      { key: 'yard', label: '码 (yard)', factor: 0.9144 },
      { key: 'mile', label: '英里 (mile)', factor: 1609.344 },
    ],
  },
  {
    key: 'area',
    label: '面积',
    defaultFrom: 'm2',
    defaultTo: 'km2',
    units: [
      { key: 'mm2', label: '平方毫米 (mm²)', factor: 1e-6 },
      { key: 'cm2', label: '平方厘米 (cm²)', factor: 1e-4 },
      { key: 'm2', label: '平方米 (m²)', factor: 1 },
      { key: 'km2', label: '平方千米 (km²)', factor: 1e6 },
      { key: 'hectare', label: '公顷', factor: 10000 },
      { key: 'mu', label: '亩', factor: 666.6666667 },
      { key: 'ft2', label: '平方英尺 (ft²)', factor: 0.09290304 },
      { key: 'acre', label: '英亩 (acre)', factor: 4046.8564224 },
    ],
  },
  {
    key: 'weight',
    label: '重量',
    defaultFrom: 'kg',
    defaultTo: 'jin',
    units: [
      { key: 'mg', label: '毫克 (mg)', factor: 1e-6 },
      { key: 'g', label: '克 (g)', factor: 0.001 },
      { key: 'kg', label: '千克 (kg)', factor: 1 },
      { key: 't', label: '吨 (t)', factor: 1000 },
      { key: 'jin', label: '斤', factor: 0.5 },
      { key: 'liang', label: '两', factor: 0.05 },
      { key: 'lb', label: '磅 (lb)', factor: 0.45359237 },
      { key: 'oz', label: '盎司 (oz)', factor: 0.028349523125 },
    ],
  },
  {
    key: 'temperature',
    label: '温度',
    defaultFrom: 'c',
    defaultTo: 'f',
    units: [
      { key: 'c', label: '摄氏度 (°C)', factor: 1 },
      { key: 'f', label: '华氏度 (°F)', factor: 1 },
      { key: 'k', label: '开尔文 (K)', factor: 1 },
    ],
    note: '温度换算使用公式：°F = °C × 9/5 + 32；K = °C + 273.15，不能按倍数直接换算。',
  },
  {
    key: 'data',
    label: '数据存储',
    defaultFrom: 'mb',
    defaultTo: 'gb',
    units: [
      { key: 'bit', label: '位 (bit)', factor: 0.125 },
      { key: 'b', label: '字节 (B)', factor: 1 },
      { key: 'kb', label: '千字节 (KB)', factor: 1024 },
      { key: 'mb', label: '兆字节 (MB)', factor: 1024 ** 2 },
      { key: 'gb', label: '吉字节 (GB)', factor: 1024 ** 3 },
      { key: 'tb', label: '太字节 (TB)', factor: 1024 ** 4 },
    ],
    note: '数据存储按 1 KB = 1024 B 的二进制口径计算；硬盘/手机厂商常用十进制标称（1 KB = 1000 B），因此标称容量与系统显示会有差异。',
  },
  {
    key: 'time',
    label: '时间',
    defaultFrom: 'min',
    defaultTo: 'h',
    units: [
      { key: 'ms', label: '毫秒 (ms)', factor: 0.001 },
      { key: 's', label: '秒 (s)', factor: 1 },
      { key: 'min', label: '分钟 (min)', factor: 60 },
      { key: 'h', label: '小时 (h)', factor: 3600 },
      { key: 'day', label: '天 (day)', factor: 86400 },
      { key: 'week', label: '周 (week)', factor: 604800 },
    ],
  },
]

function toCelsius(value: number, unitKey: string): number {
  if (unitKey === 'f') return (value - 32) * 5 / 9
  if (unitKey === 'k') return value - 273.15
  return value
}

function fromCelsius(value: number, unitKey: string): number {
  if (unitKey === 'f') return value * 9 / 5 + 32
  if (unitKey === 'k') return value + 273.15
  return value
}

function convert(value: number, categoryKey: CategoryKey, fromUnit: UnitDef, toUnit: UnitDef): number {
  if (categoryKey === 'temperature') {
    return fromCelsius(toCelsius(value, fromUnit.key), toUnit.key)
  }
  return value * fromUnit.factor / toUnit.factor
}

function formatValue(value: number): string {
  if (!Number.isFinite(value)) return ''
  const cleaned = Number(value.toPrecision(10))
  if (Object.is(cleaned, -0)) return '0'
  if (cleaned !== 0 && (Math.abs(cleaned) < 1e-6 || Math.abs(cleaned) >= 1e15)) {
    return cleaned.toExponential(6)
  }
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

export default function UnitPage() {
  const [category, setCategory] = useState<CategoryKey>('length')
  const [fromKey, setFromKey] = useState('m')
  const [toKey, setToKey] = useState('km')
  const [input, setInput] = useState('1')
  const [copiedKey, setCopiedKey] = useState('')

  const current = CATEGORIES.find((item) => item.key === category) ?? CATEGORIES[0]
  const fromUnit = current.units.find((item) => item.key === fromKey) ?? current.units[0]
  const toUnit = current.units.find((item) => item.key === toKey) ?? current.units[1] ?? current.units[0]

  const trimmed = input.trim()
  const numeric = trimmed === '' ? null : Number(trimmed)
  const invalid = numeric !== null && !Number.isFinite(numeric)

  const result = useMemo(() => {
    if (numeric === null || !Number.isFinite(numeric)) return null
    return convert(numeric, current.key, fromUnit, toUnit)
  }, [numeric, current.key, fromUnit, toUnit])

  const resultText = result === null ? '' : formatValue(result)

  const allResults = useMemo(() => {
    if (numeric === null || !Number.isFinite(numeric)) return []
    return current.units.map((unit) => ({
      unit,
      text: formatValue(convert(numeric, current.key, fromUnit, unit)),
    }))
  }, [numeric, current.key, fromUnit, current.units])

  const handleCategory = useCallback((next: CategoryDef) => {
    setCategory(next.key)
    setFromKey(next.defaultFrom)
    setToKey(next.defaultTo)
    setCopiedKey('')
  }, [])

  const handleCopy = useCallback(async (text: string, key: string) => {
    if (!text) return
    if (await copyText(text)) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 1500)
    }
  }, [])

  const swapUnits = useCallback(() => {
    setFromKey(toUnit.key)
    setToKey(fromUnit.key)
  }, [fromUnit.key, toUnit.key])

  return (
    <div>
      <ToolHeader
        title="单位换算"
        description="长度、面积、重量、温度、数据存储与时间单位实时互转，并给出全部单位对照结果"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* 分类 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">换算分类</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleCategory(item)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    item.key === category
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {current.note && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-5">{current.note}</p>
            )}
          </div>

          {/* 输入与结果 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto_1fr] gap-3 md:items-end">
              <div>
                <label htmlFor="unit-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  数值
                </label>
                <input
                  id="unit-input"
                  type="text"
                  inputMode="decimal"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="请输入数值"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="unit-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  从
                </label>
                <select
                  id="unit-from"
                  value={fromUnit.key}
                  onChange={(event) => setFromKey(event.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {current.units.map((unit) => (
                    <option key={unit.key} value={unit.key}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="hidden md:block text-sm mb-2">&nbsp;</span>
                <button
                  type="button"
                  onClick={swapUnits}
                  title="交换单位"
                  className="w-full md:w-auto h-[38px] px-3 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  ⇄
                </button>
              </div>

              <div>
                <label htmlFor="unit-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  到
                </label>
                <select
                  id="unit-to"
                  value={toUnit.key}
                  onChange={(event) => setToKey(event.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {current.units.map((unit) => (
                    <option key={unit.key} value={unit.key}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {trimmed === '' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">请输入数值后查看换算结果。</p>
            )}
            {invalid && (
              <p className="text-sm text-red-600 dark:text-red-400">请输入有效的数字，例如 12 或 3.5。</p>
            )}

            {resultText !== '' && (
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-gray-600 dark:text-gray-300 break-all">
                    <span className="font-mono">{trimmed}</span> {fromUnit.label} =
                    <span className="mx-2 text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">
                      {resultText}
                    </span>
                    {toUnit.label}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(resultText, 'result')}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {copiedKey === 'result' ? '已复制' : '复制结果'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 全单位对照 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                换算到所有单位
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-500">点击结果即可复制</span>
            </div>
            {allResults.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">输入有效数值后显示全部单位对照。</p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {allResults.map(({ unit, text }) => (
                  <button
                    key={unit.key}
                    type="button"
                    onClick={() => handleCopy(text, unit.key)}
                    className="w-full flex items-center justify-between gap-4 py-2.5 px-2 text-left rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-300">{unit.label}</span>
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-sm text-gray-900 dark:text-white break-all">{text}</span>
                      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                        {copiedKey === unit.key ? '已复制' : '复制'}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 换算结果为去浮点误差后的近似值，最多保留 10 位有效数字。</p>
            <p>2. 温度采用公式换算；数据存储按 1024 进制，厂商标称容量通常按 1000 进制，二者存在差异。</p>
            <p>3. 所有计算在浏览器本地完成，不会上传任何数据。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
