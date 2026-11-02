/**
 * PHP print_r 解析器
 * 支持 Array (...) 与 ClassName Object (...) 的常见输出
 */

import type { ParsedValue } from './varDumpParser'

/**
 * 根据文本推断标量类型
 */
function scalarValue(raw: string): ParsedValue {
  if (/^-?\d+$/.test(raw)) {
    return { type: 'int', value: parseInt(raw, 10), isCollapsed: false }
  }

  if (
    /^-?(?:\d+\.\d*|\d*\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) ||
    /^-?\d+[eE][+-]?\d+$/.test(raw)
  ) {
    return { type: 'float', value: parseFloat(raw), isCollapsed: false }
  }

  if (raw === 'true' || raw === 'false') {
    return { type: 'bool', value: raw === 'true', isCollapsed: false }
  }

  if (raw === 'NULL' || raw === 'null') {
    return { type: 'null', value: null, isCollapsed: false }
  }

  return { type: 'string', value: raw, length: raw.length, isCollapsed: false }
}

class PrintRParser {
  private input: string
  private position = 0

  constructor(input: string) {
    this.input = input
  }

  /**
   * 解析 print_r 输出，允许一次粘贴多个值
   */
  parse(): ParsedValue[] {
    const results: ParsedValue[] = []

    while (this.position < this.input.length) {
      this.skipWhitespace()
      if (this.position >= this.input.length) break

      const start = this.position
      const value = this.parseValue()
      if (value) {
        results.push(value)
      }
      // 无法解析时跳过当前字符，避免死循环
      if (this.position === start) {
        this.position++
      }
    }

    return results
  }

  private parseValue(): ParsedValue | null {
    this.skipWhitespace()
    if (this.position >= this.input.length) return null

    const rest = this.input.slice(this.position, this.position + 200)

    // Array\n(\n ... \n)
    const arrayMatch = /^Array\s*\(/.exec(rest)
    if (arrayMatch) {
      this.position += arrayMatch[0].length
      return this.parseArrayBody()
    }

    // stdClass Object\n(\n ... \n) / App\User Object (...)
    const objectMatch =
      /^([A-Za-z_\u0080-\uFFFF][A-Za-z0-9_\\\u0080-\uFFFF]*)\s+Object\s*\(/.exec(rest)
    if (objectMatch) {
      this.position += objectMatch[0].length
      return this.parseObjectBody(objectMatch[1])
    }

    return this.parseScalar()
  }

  private parseArrayBody(): ParsedValue {
    const children: ParsedValue[] = []

    while (this.position < this.input.length) {
      this.skipWhitespace()
      if (this.position >= this.input.length) break

      const entryStart = this.position

      if (this.input[this.position] === ')') {
        this.position++
        break
      }

      let key: string | number | null = null
      if (this.input[this.position] === '[') {
        const closeIndex = this.input.indexOf(']', this.position + 1)
        if (closeIndex === -1) break
        const rawKey = this.input.slice(this.position + 1, closeIndex).trim()
        key = /^-?\d+$/.test(rawKey) ? parseInt(rawKey, 10) : rawKey
        this.position = closeIndex + 1
        this.skipWhitespace()
        if (this.input.slice(this.position, this.position + 2) === '=>') {
          this.position += 2
        }
      }

      this.skipInlineWhitespace()
      const value = this.parseEntryValue()
      if (value) {
        children.push(key === null ? value : { ...value, key })
      }

      if (this.position === entryStart) {
        this.position++
      }
    }

    return {
      type: 'array',
      value: `Array (${children.length})`,
      length: children.length,
      children,
      isCollapsed: false
    }
  }

  private parseObjectBody(className: string): ParsedValue {
    const properties: Record<string, ParsedValue> = {}
    let count = 0

    while (this.position < this.input.length) {
      this.skipWhitespace()
      if (this.position >= this.input.length) break

      const entryStart = this.position

      if (this.input[this.position] === ')') {
        this.position++
        break
      }

      let name = ''
      if (this.input[this.position] === '[') {
        const closeIndex = this.input.indexOf(']', this.position + 1)
        if (closeIndex === -1) break
        name = this.input.slice(this.position + 1, closeIndex).trim()
        this.position = closeIndex + 1
        this.skipWhitespace()
        if (this.input.slice(this.position, this.position + 2) === '=>') {
          this.position += 2
        }
      }

      this.skipInlineWhitespace()
      const value = this.parseEntryValue()
      if (value) {
        properties[name || `prop${count}`] = value
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
   * print_r 中空值（空字符串 / false / null）会输出为空白，这里还原为空字符串
   */
  private parseEntryValue(): ParsedValue | null {
    if (this.position >= this.input.length) return null

    const char = this.input[this.position]
    const emptyValue =
      char === '\n' ||
      char === '\r' ||
      char === ')' ||
      (char === '[' &&
        /^\[[^\]]*\]\s*=>/.test(this.input.slice(this.position, this.position + 120)))

    if (emptyValue) {
      return { type: 'string', value: '', length: 0, isCollapsed: false }
    }

    return this.parseValue()
  }

  private parseScalar(): ParsedValue | null {
    this.skipInlineWhitespace()
    if (this.position >= this.input.length) return null

    const start = this.position
    while (this.position < this.input.length) {
      const char = this.input[this.position]
      if (char === '\n' || char === '\r' || char === ')' || char === '[') break
      this.position++
    }

    const raw = this.input.slice(start, this.position).trim()
    if (!raw) {
      if (this.position === start && this.position < this.input.length) {
        this.position++
      }
      return null
    }

    return scalarValue(raw)
  }

  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++
    }
  }

  private skipInlineWhitespace(): void {
    while (this.position < this.input.length && /^[ \t]/.test(this.input[this.position])) {
      this.position++
    }
  }
}

/**
 * 解析 print_r 输出
 */
export function parsePrintR(input: string): ParsedValue[] {
  return new PrintRParser(input.trim()).parse()
}

/**
 * 判断输入是否像 print_r 输出
 */
export function looksLikePrintR(input: string): boolean {
  const text = input.trim()
  return (
    /^Array\s*\(/.test(text) ||
    /^[A-Za-z_\u0080-\uFFFF][A-Za-z0-9_\\\u0080-\uFFFF]*\s+Object\s*\(/.test(text)
  )
}
