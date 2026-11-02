/**
 * 调试输出格式转换与统一解析入口
 * 支持 JSON（json_encode）与 Laravel dump()/dd()（Symfony VarDumper）常见输出
 */

import type { ParsedValue } from './varDumpParser'
import { VarDumpParser } from './varDumpParser'
import { looksLikePrintR, parsePrintR } from './printRParser'

export type InputFormat = 'auto' | 'vardump' | 'printr' | 'json' | 'laravel'

export const INPUT_FORMAT_OPTIONS: Array<{ value: InputFormat; label: string }> = [
  { value: 'auto', label: '自动识别' },
  { value: 'vardump', label: 'var_dump' },
  { value: 'printr', label: 'print_r' },
  { value: 'json', label: 'JSON' },
  { value: 'laravel', label: 'Laravel dump' }
]

export const UNRECOGNIZED_MESSAGE =
  '暂无法识别该格式，请粘贴 var_dump/print_r/json_encode 输出'

const FORMAT_LABELS: Record<InputFormat, string> = {
  auto: '自动识别',
  vardump: 'var_dump',
  printr: 'print_r',
  json: 'JSON',
  laravel: 'Laravel dump'
}

/**
 * JSON 值转 ParsedValue
 */
function jsonToParsedValue(value: unknown): ParsedValue {
  if (value === null) {
    return { type: 'null', value: null, isCollapsed: false }
  }

  if (typeof value === 'string') {
    return { type: 'string', value, length: value.length, isCollapsed: false }
  }

  if (typeof value === 'number') {
    return {
      type: Number.isInteger(value) ? 'int' : 'float',
      value,
      isCollapsed: false
    }
  }

  if (typeof value === 'boolean') {
    return { type: 'bool', value, isCollapsed: false }
  }

  if (Array.isArray(value)) {
    const children: ParsedValue[] = value.map((item, index) => ({
      ...jsonToParsedValue(item),
      key: index
    }))

    return {
      type: 'array',
      value: `Array (${children.length})`,
      length: children.length,
      children,
      isCollapsed: false
    }
  }

  if (typeof value === 'object') {
    const properties: Record<string, ParsedValue> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      properties[key] = jsonToParsedValue(item)
    })

    const length = Object.keys(properties).length
    return {
      type: 'object',
      value: `Object (${length})`,
      className: 'Object',
      length,
      properties,
      isCollapsed: false
    }
  }

  const text = String(value)
  return { type: 'string', value: text, length: text.length, isCollapsed: false }
}

/**
 * Symfony VarDumper（Laravel dump/dd）解析器
 * 支持 array:N [ ... ]、ClassName {#id ... } 结构
 */
class SymfonyDumpParser {
  private input: string
  private position = 0

  constructor(input: string) {
    this.input = input
  }

  parse(): ParsedValue[] {
    const results: ParsedValue[] = []

    while (this.position < this.input.length) {
      this.skipTrivia()
      if (this.position >= this.input.length) break

      const start = this.position
      const value = this.parseValue()
      if (value) {
        results.push(value)
      }
      if (this.position === start) {
        this.position++
      }
    }

    return results
  }

  private parseValue(): ParsedValue | null {
    this.skipTrivia()
    if (this.position >= this.input.length) return null

    const window = this.input.slice(this.position, this.position + 240)
    const char = this.input[this.position]

    // array:N [ ... ] / array [ ... ]
    const arrayMatch = /^array(?::(\d+))?\s*\[/.exec(window)
    if (arrayMatch) {
      this.position += arrayMatch[0].length
      const expectedLength = arrayMatch[1] ? parseInt(arrayMatch[1], 10) : undefined
      return this.parseArrayBody(expectedLength)
    }

    // 裸数组 [ ... ]
    if (char === '[') {
      this.position++
      return this.parseArrayBody(undefined)
    }

    // ClassName {#123 ... }
    const objectMatch = /^([A-Za-z_\\][A-Za-z0-9_\\$]*)\s*\{\#\d*/.exec(window)
    if (objectMatch) {
      this.position += objectMatch[0].length
      return this.parseObjectBody(objectMatch[1])
    }

    // ClassName { ... }
    const plainObjectMatch = /^([A-Za-z_\\][A-Za-z0-9_\\$]*)\s*\{/.exec(window)
    if (plainObjectMatch) {
      this.position += plainObjectMatch[0].length
      return this.parseObjectBody(plainObjectMatch[1])
    }

    if (char === '"' || char === "'") {
      return this.parseQuoted()
    }

    if (window.startsWith('*RECURSION*')) {
      this.position += '*RECURSION*'.length
      return { type: 'resource', value: '*RECURSION*', isCollapsed: false }
    }

    const boolMatch = /^(true|false|TRUE|FALSE|null|NULL)\b/.exec(window)
    if (boolMatch) {
      const token = boolMatch[1].toLowerCase()
      this.position += boolMatch[0].length
      if (token === 'null') {
        return { type: 'null', value: null, isCollapsed: false }
      }
      return { type: 'bool', value: token === 'true', isCollapsed: false }
    }

    const numberMatch = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(window)
    if (numberMatch) {
      const raw = numberMatch[0]
      this.position += raw.length
      if (/^-?\d+$/.test(raw)) {
        return { type: 'int', value: parseInt(raw, 10), isCollapsed: false }
      }
      return { type: 'float', value: parseFloat(raw), isCollapsed: false }
    }

    const tokenMatch = /^[^\s,\[\]{}]+/.exec(window)
    if (!tokenMatch) return null

    this.position += tokenMatch[0].length
    return {
      type: 'string',
      value: tokenMatch[0],
      length: tokenMatch[0].length,
      isCollapsed: false
    }
  }

  private parseArrayBody(expectedLength?: number): ParsedValue {
    const children: ParsedValue[] = []

    while (this.position < this.input.length) {
      this.skipTrivia()
      if (this.position >= this.input.length) break

      const entryStart = this.position

      if (this.input[this.position] === ']') {
        this.position++
        break
      }

      const key = this.tryParseKey()
      this.skipTrivia()
      const value = this.parseValue()
      if (value) {
        children.push(key === null ? { ...value, key: children.length } : { ...value, key })
      }

      if (this.position === entryStart) {
        this.position++
      }
    }

    const length = expectedLength !== undefined ? expectedLength : children.length

    return {
      type: 'array',
      value: `Array (${length})`,
      length,
      children,
      isCollapsed: false
    }
  }

  private parseObjectBody(className: string): ParsedValue {
    const properties: Record<string, ParsedValue> = {}
    let count = 0

    while (this.position < this.input.length) {
      this.skipTrivia()
      if (this.position >= this.input.length) break

      const entryStart = this.position

      if (this.input[this.position] === '}') {
        this.position++
        break
      }

      while (
        this.position < this.input.length &&
        /^[#+\-~*!]/.test(this.input[this.position])
      ) {
        this.position++
      }

      let name = ''
      if (this.input[this.position] === '"' || this.input[this.position] === "'") {
        name = String(this.parseQuoted().value)
      } else {
        const nameMatch = /^[^:\n\r}]+/.exec(this.input.slice(this.position, this.position + 160))
        if (nameMatch) {
          name = nameMatch[0].trim()
          this.position += nameMatch[0].length
        }
      }

      if (this.input[this.position] === ':') {
        this.position++
      } else if (this.input.slice(this.position, this.position + 2) === '=>') {
        this.position += 2
      }

      this.skipTrivia()
      const value = this.parseValue()
      if (value) {
        const propName = name || `prop${count}`
        properties[propName] = value
        count++
      }

      if (this.position === entryStart) {
        this.position++
      }
    }

    return {
      type: 'object',
      value: `${className} Object (${count})`,
      className,
      length: count,
      properties,
      isCollapsed: false
    }
  }

  /**
   * 数组键：支持 "key" => value 与 0 => value
   */
  private tryParseKey(): string | number | null {
    const start = this.position

    if (this.input[this.position] === '"' || this.input[this.position] === "'") {
      const quoted = this.parseQuoted()
      this.skipTrivia()
      if (this.input.slice(this.position, this.position + 2) === '=>') {
        this.position += 2
        return String(quoted.value)
      }
      this.position = start
      return null
    }

    const numberKey = /^-?\d+/.exec(this.input.slice(this.position, this.position + 32))
    if (numberKey) {
      const afterKey = this.position + numberKey[0].length
      const arrow = /^\s*=>/.exec(this.input.slice(afterKey, afterKey + 16))
      if (arrow) {
        this.position = afterKey + arrow[0].length
        return parseInt(numberKey[0], 10)
      }
    }

    this.position = start
    return null
  }

  private parseQuoted(): ParsedValue {
    const quote = this.input[this.position]
    this.position++

    let value = ''
    while (this.position < this.input.length) {
      const char = this.input[this.position]
      if (char === '\\') {
        this.position++
        if (this.position < this.input.length) {
          value += this.input[this.position]
          this.position++
        }
        continue
      }
      if (char === quote) {
        this.position++
        break
      }
      value += char
      this.position++
    }

    return { type: 'string', value, length: value.length, isCollapsed: false }
  }

  /**
   * 跳过空白、逗号与分号
   */
  private skipTrivia(): void {
    while (
      this.position < this.input.length &&
      /^[\s,;]$/.test(this.input[this.position])
    ) {
      this.position++
    }
  }
}

function tryParseJson(text: string): { ok: true; data: unknown } | { ok: false } {
  try {
    return { ok: true, data: JSON.parse(text) }
  } catch {
    return { ok: false }
  }
}

function looksLikeVarDump(input: string): boolean {
  const text = input.trim()
  return (
    /(?:^|\s)(?:array|object|string|int|float|bool|resource)\s*\(/.test(text) ||
    /^NULL$/i.test(text)
  )
}

function looksLikeLaravel(input: string): boolean {
  return /array:\d+\s*\[/.test(input) || /\{\s*#\d+/.test(input)
}

/**
 * 自动识别输入格式
 */
export function detectInputFormat(input: string): Exclude<InputFormat, 'auto'> | null {
  const text = input.trim()
  if (!text) return null

  // 以 { 或 [ 开头且能 JSON.parse 成功，视为 json_encode 输出
  if (/^[\[{]/.test(text) && tryParseJson(text).ok) {
    return 'json'
  }

  if (looksLikeVarDump(text)) {
    return 'vardump'
  }

  if (looksLikeLaravel(text)) {
    return 'laravel'
  }

  if (looksLikePrintR(text)) {
    return 'printr'
  }

  // 标量 JSON（如 25、"text"、true、null）
  if (tryParseJson(text).ok) {
    return 'json'
  }

  return null
}

function parseAs(input: string, format: Exclude<InputFormat, 'auto'>): ParsedValue[] {
  switch (format) {
    case 'vardump':
      return new VarDumpParser(input).parse()

    case 'printr':
      return parsePrintR(input)

    case 'json': {
      const json = tryParseJson(input)
      if (!json.ok) {
        throw new Error(`JSON 语法错误，请检查是否粘贴了完整的 json_encode 输出。${UNRECOGNIZED_MESSAGE}`)
      }
      return [jsonToParsedValue(json.data)]
    }

    case 'laravel':
      return new SymfonyDumpParser(input).parse()
  }
}

/**
 * 同步解析（auto 时依次尝试各解析器）
 */
export function parseInputSync(input: string, format: InputFormat = 'auto'): ParsedValue[] {
  const text = input.trim()
  if (!text) {
    throw new Error('请先粘贴要解析的调试输出内容')
  }

  if (format === 'auto') {
    const detected = detectInputFormat(text)
    if (!detected) {
      throw new Error(UNRECOGNIZED_MESSAGE)
    }

    const candidates: Array<Exclude<InputFormat, 'auto'>> = [detected]
    ;(['vardump', 'printr', 'laravel', 'json'] as const).forEach((candidate) => {
      if (!candidates.includes(candidate)) candidates.push(candidate)
    })

    for (const candidate of candidates) {
      try {
        const result = parseAs(text, candidate)
        if (result.length > 0) return result
      } catch {
        // 尝试下一个解析器
      }
    }

    throw new Error(UNRECOGNIZED_MESSAGE)
  }

  try {
    const result = parseAs(text, format)
    if (result.length > 0) return result
  } catch (error) {
    if (format === 'json' && error instanceof Error) {
      throw error
    }
    throw new Error(
      `${FORMAT_LABELS[format]} 解析失败，${UNRECOGNIZED_MESSAGE}`
    )
  }

  throw new Error(`${FORMAT_LABELS[format]} 解析失败，${UNRECOGNIZED_MESSAGE}`)
}

/**
 * 异步解析：避免阻塞主线程
 */
export async function parseInput(
  input: string,
  format: InputFormat = 'auto'
): Promise<ParsedValue[]> {
  return new Promise((resolve, reject) => {
    const scheduleWork = (callback: () => void) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(callback, { timeout: 150 })
      } else {
        setTimeout(callback, 0)
      }
    }

    scheduleWork(() => {
      try {
        resolve(parseInputSync(input, format))
      } catch (error) {
        reject(error)
      }
    })
  })
}
