'use client'

import { useCallback, useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['HEX/RGB/HSL', '取色器', '色板生成', '前景色建议']

const DEFAULT_COLOR = '#3B82F6'
const primaryButtonClass =
  'px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'
const secondaryButtonClass =
  'px-3 py-1.5 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'

interface Rgb {
  r: number
  g: number
  b: number
  a: number
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续尝试兼容方案
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
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
    <button type="button" onClick={handleCopy} className={secondaryButtonClass}>
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function rgbToHex(rgb: Rgb): string {
  const toHex = (value: number) =>
    clamp(Math.round(value), 0, 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase()
}

function formatAlpha(alpha: number): string {
  return String(Number(clamp(alpha, 0, 1).toFixed(2)))
}

function rgbToCss(rgb: Rgb): string {
  const r = Math.round(rgb.r)
  const g = Math.round(rgb.g)
  const b = Math.round(rgb.b)
  return rgb.a < 1 ? `rgba(${r}, ${g}, ${b}, ${formatAlpha(rgb.a)})` : `rgb(${r}, ${g}, ${b})`
}

function parseHex(value: string): Rgb | null {
  const hex = value.replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$/.test(hex) && !/^[0-9a-fA-F]{6}$/.test(hex) && !/^[0-9a-fA-F]{8}$/.test(hex)) {
    return null
  }
  if (hex.length === 3) {
    return {
      r: parseInt(`${hex[0]}${hex[0]}`, 16),
      g: parseInt(`${hex[1]}${hex[1]}`, 16),
      b: parseInt(`${hex[2]}${hex[2]}`, 16),
      a: 1,
    }
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
    a: hex.length === 8 ? Number((parseInt(hex.slice(6, 8), 16) / 255).toFixed(3)) : 1,
  }
}

function parseAlpha(part: string): number | null {
  const value = Number.parseFloat(part)
  if (!Number.isFinite(value)) return null
  const alpha = part.endsWith('%') ? value / 100 : value
  if (alpha < 0 || alpha > 1) return null
  return Number(alpha.toFixed(3))
}

function parseRgbFunction(value: string): Rgb | null {
  const match = value.match(/^rgba?\(([^)]*)\)$/i)
  if (!match) return null
  const parts = match[1]
    .trim()
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean)
  if (parts.length < 3 || parts.length > 4) return null

  const channel = (part: string): number | null => {
    const parsed = Number.parseFloat(part)
    if (!Number.isFinite(parsed)) return null
    const result = part.endsWith('%') ? (parsed / 100) * 255 : parsed
    if (result < 0 || result > 255) return null
    return result
  }

  const r = channel(parts[0])
  const g = channel(parts[1])
  const b = channel(parts[2])
  if (r === null || g === null || b === null) return null
  const a = parts.length === 4 ? parseAlpha(parts[3]) : 1
  if (a === null) return null
  return { r, g, b, a }
}

function hslToRgb(hue: number, saturation: number, lightness: number, alpha: number): Rgb {
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - c / 2
  let rp = 0
  let gp = 0
  let bp = 0
  if (hue < 60) {
    rp = c
    gp = x
  } else if (hue < 120) {
    rp = x
    gp = c
  } else if (hue < 180) {
    gp = c
    bp = x
  } else if (hue < 240) {
    gp = x
    bp = c
  } else if (hue < 300) {
    rp = x
    bp = c
  } else {
    rp = c
    bp = x
  }
  const to255 = (value: number) => clamp(Math.round((value + m) * 255), 0, 255)
  return { r: to255(rp), g: to255(gp), b: to255(bp), a: alpha }
}

function parseHslFunction(value: string): Rgb | null {
  const match = value.match(/^hsla?\(([^)]*)\)$/i)
  if (!match) return null
  const parts = match[1]
    .trim()
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean)
  if (parts.length < 3 || parts.length > 4) return null

  const hue = Number.parseFloat(parts[0])
  const saturation = Number.parseFloat(parts[1].replace('%', ''))
  const lightness = Number.parseFloat(parts[2].replace('%', ''))
  if (!Number.isFinite(hue) || !Number.isFinite(saturation) || !Number.isFinite(lightness)) {
    return null
  }
  if (saturation < 0 || saturation > 100 || lightness < 0 || lightness > 100) return null
  const a = parts.length === 4 ? parseAlpha(parts[3]) : 1
  if (a === null) return null
  const normalizedHue = ((hue % 360) + 360) % 360
  return hslToRgb(normalizedHue, saturation / 100, lightness / 100, a)
}

function parseColor(value: string): Rgb | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^#?[0-9a-fA-F]{3}$/.test(trimmed) || /^#?[0-9a-fA-F]{6}$/.test(trimmed) || /^#?[0-9a-fA-F]{8}$/.test(trimmed)) {
    return parseHex(trimmed)
  }
  if (/^rgba?\(/i.test(trimmed)) return parseRgbFunction(trimmed)
  if (/^hsla?\(/i.test(trimmed)) return parseHslFunction(trimmed)
  return null
}

function rgbToHsl(rgb: Rgb): { h: number; s: number; l: number } {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function rgbToHsv(rgb: Rgb): { h: number; s: number; v: number } {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : delta / max
  return { h: Math.round(h), s: Math.round(s * 100), v: Math.round(max * 100) }
}

function rgbToCmyk(rgb: Rgb): { c: number; m: number; y: number; k: number } {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const k = 1 - Math.max(r, g, b)
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 }
  return {
    c: Math.round(((1 - r - k) / (1 - k)) * 100),
    m: Math.round(((1 - g - k) / (1 - k)) * 100),
    y: Math.round(((1 - b - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  }
}

function relativeLuminance(rgb: Rgb): number {
  const channel = (value: number) => {
    const v = value / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

function mixColor(rgb: Rgb, target: Rgb, ratio: number): Rgb {
  return {
    r: Math.round(rgb.r * (1 - ratio) + target.r * ratio),
    g: Math.round(rgb.g * (1 - ratio) + target.g * ratio),
    b: Math.round(rgb.b * (1 - ratio) + target.b * ratio),
    a: 1,
  }
}

function randomColorHex(): string {
  const bytes = new Uint8Array(3)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 3; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return rgbToHex({ r: bytes[0], g: bytes[1], b: bytes[2], a: 1 })
}

function PaletteSwatch({ hex, onPick }: { hex: string; onPick: (hex: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(hex)}
      aria-label={`使用颜色 ${hex}`}
      title={hex}
      className="overflow-hidden rounded-lg border border-gray-200 text-left transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
    >
      <span className="block h-12 w-full" style={{ backgroundColor: hex }} />
      <span className="block bg-white px-1.5 py-1 font-mono text-[11px] text-gray-700 dark:bg-gray-900 dark:text-gray-200">
        {hex}
      </span>
    </button>
  )
}

export default function ColorPage() {
  const [input, setInput] = useState(DEFAULT_COLOR)
  const [notice, setNotice] = useState('')

  const rgb = useMemo(() => parseColor(input), [input])
  const invalid = input.trim().length > 0 && rgb === null

  const formats = useMemo(() => {
    if (!rgb) return []
    const r = Math.round(rgb.r)
    const g = Math.round(rgb.g)
    const b = Math.round(rgb.b)
    const hsl = rgbToHsl(rgb)
    const hsv = rgbToHsv(rgb)
    const cmyk = rgbToCmyk(rgb)
    return [
      { label: 'HEX', value: rgbToHex(rgb) },
      { label: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
      { label: 'RGBA', value: rgbToCss(rgb) },
      { label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
      { label: 'HSV', value: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)` },
      { label: 'CMYK', value: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)` },
    ]
  }, [rgb])

  const palette = useMemo(() => {
    if (!rgb) return { lights: [] as string[], darks: [] as string[] }
    const lights: string[] = []
    const darks: string[] = []
    for (let i = 1; i <= 5; i++) {
      const ratio = i * 0.15
      lights.push(rgbToHex(mixColor(rgb, { r: 255, g: 255, b: 255, a: 1 }, ratio)))
      darks.push(rgbToHex(mixColor(rgb, { r: 0, g: 0, b: 0, a: 1 }, ratio)))
    }
    return { lights, darks }
  }, [rgb])

  const preview = useMemo(() => {
    if (!rgb) {
      return { background: '', foreground: '#111827', contrast: 0, mode: 'black' }
    }
    const luminance = relativeLuminance(rgb)
    const blackContrast = (luminance + 0.05) / 0.05
    const whiteContrast = 1.05 / (luminance + 0.05)
    const useBlack = blackContrast >= whiteContrast
    return {
      background: rgbToCss(rgb),
      foreground: useBlack ? '#111827' : '#FFFFFF',
      contrast: useBlack ? blackContrast : whiteContrast,
      mode: useBlack ? '深色文字' : '白色文字',
    }
  }, [rgb])

  const handlePick = useCallback(async (hex: string) => {
    setInput(hex)
    if (await copyText(hex)) {
      setNotice(`已复制 ${hex}`)
      setTimeout(() => setNotice(''), 1500)
    }
  }, [])

  return (
    <div>
      <ToolHeader
        title="颜色转换"
        description="HEX、RGB、HSL、HSV、CMYK 颜色互转，支持取色器、色板生成与文字前景色建议"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 颜色输入与预览 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">选择颜色</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                支持 HEX（#RGB / #RRGGBB / #RRGGBBAA）、rgb()/rgba()、hsl()/hsla()
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="color-picker"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  取色器
                </label>
                <input
                  id="color-picker"
                  type="color"
                  value={rgb ? rgbToHex(rgb) : DEFAULT_COLOR}
                  onChange={(event) => setInput(event.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border border-gray-300 bg-transparent p-0.5 dark:border-gray-600"
                />
              </div>

              <div className="flex-1 min-w-[220px]">
                <label
                  htmlFor="color-text"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  颜色值
                </label>
                <input
                  id="color-text"
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="#3B82F6 / rgb(59, 130, 246) / hsl(217, 91%, 60%)"
                  spellCheck={false}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setInput(randomColorHex())}
                className={primaryButtonClass}
              >
                随机颜色
              </button>
            </div>

            {invalid && (
              <p className="text-sm text-red-600 dark:text-red-400">
                无法解析该颜色值，请输入合法的 HEX、rgb()/rgba() 或 hsl()/hsla() 格式。
              </p>
            )}

            <div
              className={`rounded-xl min-h-[140px] p-6 flex flex-col items-center justify-center text-center ${
                rgb ? '' : 'bg-gray-100 dark:bg-gray-700'
              }`}
              style={rgb ? { backgroundColor: preview.background } : undefined}
            >
              {rgb ? (
                <>
                  <p className="text-2xl font-semibold tracking-wide" style={{ color: preview.foreground }}>
                    Aa 文字预览
                  </p>
                  <p className="mt-2 font-mono text-sm" style={{ color: preview.foreground }}>
                    {rgbToHex(rgb)}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: preview.foreground }}>
                    建议前景色：{preview.mode}（对比度 {preview.contrast.toFixed(2)}:1）
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-300">无法解析颜色，暂无法预览</p>
              )}
            </div>
          </section>

          {/* 转换结果 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">转换结果</h2>
              {notice && <span className="text-xs text-green-600 dark:text-green-400">{notice}</span>}
            </div>

            {formats.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {formats.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700"
                  >
                    <span className="w-12 shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {item.label}
                    </span>
                    <code className="flex-1 min-w-0 font-mono text-sm break-all text-gray-800 dark:text-gray-100">
                      {item.value}
                    </code>
                    <CopyButton text={item.value} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                请输入合法的颜色值后查看转换结果。
              </p>
            )}
          </section>

          {/* 色板 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">生成色板</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                分别与白色、黑色混合生成 5 个亮色与 5 个暗色，点击色块可应用为当前颜色并复制 HEX
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">亮色</p>
              <div className="grid grid-cols-5 gap-2">
                {palette.lights.map((hex) => (
                  <PaletteSwatch key={`light-${hex}`} hex={hex} onPick={handlePick} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">暗色</p>
              <div className="grid grid-cols-5 gap-2">
                {palette.darks.map((hex) => (
                  <PaletteSwatch key={`dark-${hex}`} hex={hex} onPick={handlePick} />
                ))}
              </div>
            </div>

            {palette.lights.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                输入合法颜色后即可生成色板。
              </p>
            )}
          </section>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 所有颜色转换均在浏览器本地完成，不会上传任何数据。</p>
            <p>2. 前景色建议基于相对亮度与对比度计算，仅作为可读性参考。</p>
            <p>3. 色板由当前颜色与白色/黑色按 15%-75% 比例混合生成。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
