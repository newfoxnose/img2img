'use client'

import { useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['Unicode 转义', 'UTF-8 字节', 'HTML 数字实体', 'Base64', '本地处理']

type Converter = 'unicode' | 'utf8' | 'entity' | 'base64'
type Direction = 'encode' | 'decode'

interface ConverterMeta {
  label: string
  forwardAction: string
  backwardAction: string
  forwardPlaceholder: string
  backwardPlaceholder: string
  backwardInputLabel: string
  tip: string
}

const CONVERTERS: Record<Converter, ConverterMeta> = {
  unicode: {
    label: 'Unicode 转义',
    forwardAction: '文本 → Unicode',
    backwardAction: 'Unicode → 文本',
    forwardPlaceholder: '输入文本，例如：中文 😀',
    backwardPlaceholder: '输入转义序列，例如：\\u4e2d\\u6587 \\u{1f600} 或 \\x41',
    backwardInputLabel: '输入 Unicode 转义序列',
    tip: '按 Unicode 码点转义：emoji 等超出 BMP 的字符输出为 \\u{1f600}；解码兼容 \\uXXXX（含代理对）、\\u{XXXXX} 与 \\xXX。',
  },
  utf8: {
    label: 'UTF-8 字节',
    forwardAction: '文本 → UTF-8 字节',
    backwardAction: 'UTF-8 字节 → 文本',
    forwardPlaceholder: '输入文本，例如：中文 😀',
    backwardPlaceholder: '输入十六进制字节，例如：E4 B8 AD F0 9F 98 80',
    backwardInputLabel: '输入 UTF-8 十六进制字节',
    tip: '编码输出大写十六进制并按字节空格分隔；解码支持空格、逗号、分号、0x 前缀与连续写法。',
  },
  entity: {
    label: 'HTML 实体',
    forwardAction: '文本 → 数字实体',
    backwardAction: '数字实体 → 文本',
    forwardPlaceholder: '输入文本，例如：中文 😀',
    backwardPlaceholder: '输入数字实体，例如：&#20013;&#25991;&#128512;',
    backwardInputLabel: '输入 HTML 数字实体',
    tip: '文本按 Unicode 码点转为十进制数字实体，emoji 输出为 &#128512;；解码同时支持十进制与 &#x4e2d; 十六进制写法。',
  },
  base64: {
    label: 'Base64',
    forwardAction: '文本 → Base64',
    backwardAction: 'Base64 → 文本',
    forwardPlaceholder: '输入文本，例如：中文 😀',
    backwardPlaceholder: '粘贴 Base64，例如：5Lit5paH',
    backwardInputLabel: '输入 Base64',
    tip: '按 UTF-8 编码后转为 Base64；解码自动忽略空白、兼容 data URL 前缀与 URL-Safe 字符。',
  },
}

const converterKeys: Converter[] = ['unicode', 'utf8', 'entity', 'base64']

function textToUnicode(text: string): string {
  return Array.from(text)
    .map((char) => {
      const codePoint = char.codePointAt(0)
      if (codePoint === undefined) return ''
      if (codePoint <= 0xffff) {
        return `\\u${codePoint.toString(16).padStart(4, '0')}`
      }
      return `\\u{${codePoint.toString(16)}}`
    })
    .join('')
}

function unicodeToText(input: string): string {
  const escapePattern =
    /\\(?:u\{([0-9a-fA-F]{1,6})\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2}))/g

  // 先移除合法转义，再检查是否残留无法识别的 \u 或 \x 片段
  if (/\\[ux]/.test(input.replace(escapePattern, ''))) {
    throw new Error('存在无法识别的转义序列，请使用 \\uXXXX、\\u{XXXXX} 或 \\xXX 格式')
  }

  return input.replace(
    escapePattern,
    (_match, braced?: string, basic?: string, hex?: string) => {
      if (braced) {
        const codePoint = Number.parseInt(braced, 16)
        if (codePoint > 0x10ffff) {
          throw new Error(`码点 0x${braced} 超出 Unicode 范围（最大 0x10FFFF）`)
        }
        return String.fromCodePoint(codePoint)
      }
      if (basic) {
        return String.fromCharCode(Number.parseInt(basic, 16))
      }
      if (hex) {
        return String.fromCharCode(Number.parseInt(hex, 16))
      }
      return _match
    }
  )
}

function textToUtf8Hex(text: string): string {
  return Array.from(new TextEncoder().encode(text))
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
}

function utf8HexToText(input: string): string {
  const compact = input
    .replace(/0x/gi, '')
    .replace(/[\s,;，、]+/g, '')

  if (!compact) return ''
  if (/[^0-9a-fA-F]/.test(compact)) {
    throw new Error('包含非十六进制字符，请只输入 0-9、A-F 及空格/逗号等分隔符')
  }
  if (compact.length % 2 !== 0) {
    throw new Error('十六进制字符数为奇数，无法按字节解析，请检查是否漏写一位')
  }

  const bytes = new Uint8Array(compact.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(compact.slice(i * 2, i * 2 + 2), 16)
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('字节序列不是有效的 UTF-8 编码，可能包含非法或不完整的字节')
  }
}

function textToHtmlEntities(text: string): string {
  return Array.from(text)
    .map((char) => {
      const codePoint = char.codePointAt(0)
      return codePoint === undefined ? '' : `&#${codePoint};`
    })
    .join('')
}

function htmlEntitiesToText(input: string): string {
  return input.replace(
    /&#(?:[xX]([0-9a-fA-F]+)|([0-9]+));/g,
    (match: string, hex?: string, decimal?: string) => {
      const codePoint = hex ? Number.parseInt(hex, 16) : Number.parseInt(decimal ?? '', 10)
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        throw new Error(`实体 ${match} 超出 Unicode 码点范围（0 - 0x10FFFF）`)
      }
      return String.fromCodePoint(codePoint)
    }
  )
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = Array.from(bytes.subarray(i, i + chunkSize))
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

function textToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}

function base64ToText(input: string): string {
  let base64 = input
    .trim()
    .replace(/^data:[^,]*,/i, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const remainder = base64.length % 4
  if (remainder === 1) {
    throw new Error('Base64 长度不合法，请检查输入')
  }
  if (remainder > 1) {
    base64 += '='.repeat(4 - remainder)
  }

  let binary: string
  try {
    binary = atob(base64)
  } catch {
    throw new Error('Base64 内容格式不正确，无法解码')
  }

  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error('解码结果不是有效的 UTF-8 文本，可能为二进制数据')
  }
}

function convert(converter: Converter, direction: Direction, input: string): string {
  if (converter === 'unicode') {
    return direction === 'encode' ? textToUnicode(input) : unicodeToText(input)
  }
  if (converter === 'utf8') {
    return direction === 'encode' ? textToUtf8Hex(input) : utf8HexToText(input)
  }
  if (converter === 'entity') {
    return direction === 'encode' ? textToHtmlEntities(input) : htmlEntitiesToText(input)
  }
  return direction === 'encode' ? textToBase64(input) : base64ToText(input)
}

function CopyButton({ text }: { text: string }) {
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
      {copied ? '已复制' : '复制'}
    </button>
  )
}

export default function UnicodePage() {
  const [converter, setConverter] = useState<Converter>('unicode')
  const [direction, setDirection] = useState<Direction>('encode')
  const [input, setInput] = useState('')

  const meta = CONVERTERS[converter]

  const result = useMemo<{ value: string; error: string }>(() => {
    if (!input) return { value: '', error: '' }
    try {
      return { value: convert(converter, direction, input), error: '' }
    } catch (err) {
      return {
        value: '',
        error: err instanceof Error ? err.message : '转换失败，请检查输入内容',
      }
    }
  }, [converter, direction, input])

  const handleSwap = () => {
    if (result.value) {
      setInput(result.value)
    }
    setDirection(direction === 'encode' ? 'decode' : 'encode')
  }

  return (
    <div>
      <ToolHeader
        title="Unicode / UTF-8 转换"
        description="文本与 Unicode 转义序列、UTF-8 十六进制字节、HTML 数字实体、Base64 双向互转，正确处理中文与 emoji"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 类型与方向 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">转换类型</p>
              <div className="flex flex-wrap gap-2">
                {converterKeys.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setConverter(key)}
                    aria-pressed={converter === key}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                      converter === key
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {CONVERTERS[key].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">转换方向</p>
              <div className="inline-flex flex-wrap rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                {[
                  { key: 'encode', label: meta.forwardAction },
                  { key: 'decode', label: meta.backwardAction },
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
            </div>
          </div>

          {/* 输入 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="unicode-input"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {direction === 'encode' ? '输入文本（UTF-8）' : meta.backwardInputLabel}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInput('')}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  清空
                </button>
                <button
                  type="button"
                  onClick={handleSwap}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  交换方向
                </button>
              </div>
            </div>

            <textarea
              id="unicode-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                direction === 'encode' ? meta.forwardPlaceholder : meta.backwardPlaceholder
              }
              spellCheck={false}
              className="w-full h-40 p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* 输出 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {direction === 'encode' ? '转换结果' : '还原结果'}
              </h2>
              <CopyButton text={result.value} />
            </div>

            {result.error ? (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {result.error}
              </p>
            ) : result.value ? (
              <pre className="max-h-80 overflow-auto rounded-lg bg-gray-50 dark:bg-gray-900/40 p-4">
                <code className="font-mono text-sm break-all whitespace-pre-wrap text-gray-800 dark:text-gray-100">
                  {result.value}
                </code>
              </pre>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">结果将在这里实时显示。</p>
            )}
          </div>

          {/* 说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>{meta.tip}</p>
            <p>UTF-8 字节按标准 UTF-8 编码输出，可用于排查乱码、接口传参或字符集问题。</p>
            <p>所有转换均在浏览器本地完成，不会上传数据。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
