/**
 * JSON 进阶处理工具
 * 提供键名排序、错误定位、字符串转义、YAML/XML/CSV 转换与 JSONPath 查询
 */

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray

export interface JsonObject {
  [key: string]: JsonValue
}

export interface JsonArray extends Array<JsonValue> {}

/**
 * 解析 JSON 文本，返回可辨识的结果
 */
export type ParseJsonResult =
  | { ok: true; value: JsonValue }
  | { ok: false; error: string }

export function parseJsonValue(text: string): ParseJsonResult {
  try {
    return { ok: true, value: JSON.parse(text) as JsonValue }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '无效的 JSON',
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 键名排序                                                                    */
/* -------------------------------------------------------------------------- */

function compareKeys(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

/**
 * 递归按 key 字母序排序对象，数组顺序保持不变
 */
export function sortJsonKeys(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonKeys(item))
  }
  if (isJsonObject(value)) {
    const sorted: JsonObject = {}
    Object.keys(value)
      .sort(compareKeys)
      .forEach((key) => {
        sorted[key] = sortJsonKeys(value[key])
      })
    return sorted
  }
  return value
}

/* -------------------------------------------------------------------------- */
/* 错误定位                                                                    */
/* -------------------------------------------------------------------------- */

export interface JsonErrorLocation {
  line: number
  column: number
  index: number
}

function locationFromIndex(source: string, index: number): JsonErrorLocation {
  const clamped = Math.max(0, Math.min(index, source.length))
  const prefix = source.slice(0, clamped)
  const lines = prefix.split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
    index: clamped,
  }
}

function indexFromLineColumn(source: string, line: number, column: number): number {
  const lines = source.split('\n')
  let index = 0
  for (let i = 0; i < line - 1 && i < lines.length; i++) {
    index += lines[i].length + 1
  }
  return Math.min(index + Math.max(column - 1, 0), source.length)
}

/**
 * 从 JSON.parse 错误信息中提取位置，并换算成 1 基的行号/列号
 * 兼容 `at position 12` 与 `at line 3 column 5` 两种常见形式
 */
export function locateJsonError(
  message: string,
  source: string
): JsonErrorLocation | null {
  const lineColumnMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(message)
  if (lineColumnMatch) {
    const line = Number.parseInt(lineColumnMatch[1], 10)
    const column = Number.parseInt(lineColumnMatch[2], 10)
    if (Number.isFinite(line) && Number.isFinite(column)) {
      return {
        line,
        column,
        index: indexFromLineColumn(source, line, column),
      }
    }
  }

  const positionMatch = /at\s+position\s+(\d+)/i.exec(message)
  if (positionMatch) {
    const index = Number.parseInt(positionMatch[1], 10)
    if (Number.isFinite(index)) {
      return locationFromIndex(source, index)
    }
  }

  return null
}

/* -------------------------------------------------------------------------- */
/* 转义 / 去转义                                                               */
/* -------------------------------------------------------------------------- */

/**
 * 把文本整体转成可嵌入 JSON 的字符串字面量（单行）
 */
export function escapeForJsonString(text: string): string {
  return JSON.stringify(text)
}

export type UnescapeResult =
  | { ok: true; value: string }
  | { ok: false; error: string }

/**
 * 尝试解析一层被转义的 JSON 字符串，如 "{\"a\":1}"
 */
export function unescapeJsonString(text: string): UnescapeResult {
  try {
    const parsed: unknown = JSON.parse(text.trim())
    if (typeof parsed !== 'string') {
      return {
        ok: false,
        error: '输入内容解析后不是字符串，无法去转义',
      }
    }
    return { ok: true, value: parsed }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '无法解析为被转义的字符串',
    }
  }
}

/* -------------------------------------------------------------------------- */
/* 基础判断                                                                    */
/* -------------------------------------------------------------------------- */

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isComposite(value: JsonValue): boolean {
  return Array.isArray(value) || isJsonObject(value)
}

function isEmptyComposite(value: JsonValue): boolean {
  return (Array.isArray(value) && value.length === 0) ||
    (isJsonObject(value) && Object.keys(value).length === 0)
}

/* -------------------------------------------------------------------------- */
/* YAML 转换                                                                   */
/* -------------------------------------------------------------------------- */

const YAML_INDENT = 2

function yamlNeedsQuotes(value: string): boolean {
  if (value === '') return true
  if (/^(?:true|false|null|yes|no|on|off|~)$/i.test(value)) return true
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return true
  if (/^\s|\s$/.test(value)) return true
  if (/[\r\n\t]/.test(value)) return true
  if (/^[-?:,\[\]{}#&*!|>'"%@`]/.test(value)) return true
  if (/: |:$|\s#/.test(value)) return true
  if (/^(?:0x[0-9a-f]+|0o[0-7]+)$/i.test(value)) return true
  return false
}

function yamlString(value: string): string {
  return yamlNeedsQuotes(value) ? JSON.stringify(value) : value
}

function yamlScalar(value: JsonValue): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return yamlString(value)
  return String(value)
}

function serializeYamlBlock(value: JsonValue, indent: number): string[] {
  const pad = ' '.repeat(indent)

  if (Array.isArray(value)) {
    if (value.length === 0) return [`${pad}[]`]

    const lines: string[] = []
    value.forEach((item) => {
      if (isComposite(item)) {
        if (isEmptyComposite(item)) {
          lines.push(`${pad}- ${Array.isArray(item) ? '[]' : '{}'}`)
          return
        }
        const childLines = serializeYamlBlock(item, indent + YAML_INDENT)
        const firstContent = childLines[0].slice(indent + YAML_INDENT)
        lines.push(`${pad}- ${firstContent}`)
        lines.push(...childLines.slice(1))
      } else {
        lines.push(`${pad}- ${yamlScalar(item)}`)
      }
    })
    return lines
  }

  if (isJsonObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) return [`${pad}{}`]

    const lines: string[] = []
    keys.forEach((key) => {
      const child = value[key]
      if (isComposite(child)) {
        if (isEmptyComposite(child)) {
          lines.push(`${pad}${yamlString(key)}: ${Array.isArray(child) ? '[]' : '{}'}`)
        } else {
          lines.push(`${pad}${yamlString(key)}:`)
          lines.push(...serializeYamlBlock(child, indent + YAML_INDENT))
        }
      } else {
        lines.push(`${pad}${yamlString(key)}: ${yamlScalar(child)}`)
      }
    })
    return lines
  }

  return [`${pad}${yamlScalar(value)}`]
}

/**
 * 将 JSON 值转换为 YAML（2 空格缩进）
 */
export function jsonToYaml(value: JsonValue): string {
  return `${serializeYamlBlock(value, 0).join('\n')}\n`
}

/* -------------------------------------------------------------------------- */
/* XML 转换                                                                    */
/* -------------------------------------------------------------------------- */

export interface XmlConversionResult {
  text: string
  warnings: string[]
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function sanitizeXmlName(name: string): { name: string; changed: boolean } {
  const sanitized = name.replace(/[^A-Za-z0-9_.-]/g, '_')
  const safe = /^[A-Za-z_]/.test(sanitized) ? sanitized : `_${sanitized}`
  return { name: safe, changed: safe !== name }
}

function makeUniqueName(name: string, used: Set<string>): string {
  let candidate = name
  let suffix = 2
  while (used.has(candidate)) {
    candidate = `${name}_${suffix}`
    suffix++
  }
  used.add(candidate)
  return candidate
}

function renderXmlElement(
  name: string,
  value: JsonValue,
  indent: number,
  warnings: string[]
): string[] {
  const pad = ' '.repeat(indent)

  if (Array.isArray(value)) {
    if (value.length === 0) return [`${pad}<${name} />`]
    const lines = [`${pad}<${name}>`]
    value.forEach((item) => {
      lines.push(...renderXmlElement('item', item, indent + 2, warnings))
    })
    lines.push(`${pad}</${name}>`)
    return lines
  }

  if (isJsonObject(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) return [`${pad}<${name} />`]

    const lines = [`${pad}<${name}>`]
    const used = new Set<string>()
    keys.forEach((key) => {
      const sanitized = sanitizeXmlName(key)
      const unique = makeUniqueName(sanitized.name, used)
      if (sanitized.changed) {
        warnings.push(`键名 "${key}" 含非法字符，已替换为 "${unique}"`)
      } else if (unique !== sanitized.name) {
        warnings.push(`键名 "${key}" 重复，已改为 "${unique}"`)
      }
      lines.push(...renderXmlElement(unique, value[key], indent + 2, warnings))
    })
    lines.push(`${pad}</${name}>`)
    return lines
  }

  if (value === null) return [`${pad}<${name} />`]
  return [`${pad}<${name}>${escapeXmlText(String(value))}</${name}>`]
}

/**
 * 将 JSON 值转换为 XML，根节点默认 <root>
 */
export function jsonToXml(value: JsonValue, rootName = 'root'): XmlConversionResult {
  const warnings: string[] = []
  const lines = renderXmlElement(rootName, value, 0, warnings)
  return {
    text: `${lines.join('\n')}\n`,
    warnings: Array.from(new Set(warnings)),
  }
}

/* -------------------------------------------------------------------------- */
/* CSV 转换                                                                    */
/* -------------------------------------------------------------------------- */

export type CsvConversionResult =
  | { ok: true; csv: string }
  | { ok: false; error: string }

function formatCsvCell(value: JsonValue | undefined): string {
  if (value === undefined || value === null) return ''

  const text = isComposite(value) ? JSON.stringify(value) : String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

/**
 * 仅当根节点为对象数组时生成 CSV，复杂嵌套值使用 JSON.stringify
 */
export function jsonToCsv(value: JsonValue): CsvConversionResult {
  if (!Array.isArray(value)) {
    return { ok: false, error: '当前结构无法转换为 CSV：根节点必须是对象数组。' }
  }
  if (value.length === 0) {
    return { ok: false, error: '当前结构无法转换为 CSV：数组为空。' }
  }

  const records: JsonObject[] = []
  for (const item of value) {
    if (!isJsonObject(item)) {
      return {
        ok: false,
        error: '当前结构无法转换为 CSV：数组元素必须都是对象。',
      }
    }
    records.push(item)
  }

  const headers: string[] = []
  const seen = new Set<string>()
  records.forEach((record) => {
    Object.keys(record).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key)
        headers.push(key)
      }
    })
  })

  const lines = [headers.map((header) => formatCsvCell(header)).join(',')]
  records.forEach((record) => {
    lines.push(
      headers
        .map((header) =>
          Object.prototype.hasOwnProperty.call(record, header)
            ? formatCsvCell(record[header])
            : ''
        )
        .join(',')
    )
  })

  return { ok: true, csv: `${lines.join('\r\n')}\r\n` }
}

/* -------------------------------------------------------------------------- */
/* JSONPath 查询                                                               */
/* -------------------------------------------------------------------------- */

type PathSegment =
  | { type: 'key'; key: string; recursive: boolean }
  | { type: 'index'; index: number }
  | { type: 'wildcard'; recursive: boolean }

type ParseSuccess = { ok: true; segments: PathSegment[] }
type ParseFailure = { ok: false; error: string }
type BracketResult =
  | { ok: true; segment: PathSegment; next: number }
  | { ok: false; error: string }

function skipSpaces(expression: string, start: number): number {
  let index = start
  while (index < expression.length && /\s/.test(expression[index])) index++
  return index
}

function parseBracket(expression: string, start: number): BracketResult {
  let index = start + 1
  index = skipSpaces(expression, index)

  if (index >= expression.length) {
    return { ok: false, error: 'JSONPath 语法错误：缺少 ]' }
  }

  if (expression[index] === '*') {
    index = skipSpaces(expression, index + 1)
    if (expression[index] !== ']') {
      return { ok: false, error: 'JSONPath 语法错误：通配符后缺少 ]' }
    }
    return {
      ok: true,
      segment: { type: 'wildcard', recursive: false },
      next: index + 1,
    }
  }

  const quote = expression[index]
  if (quote === "'" || quote === '"') {
    index++
    let key = ''
    let closed = false
    while (index < expression.length) {
      const char = expression[index]
      if (char === '\\' && index + 1 < expression.length) {
        key += expression[index + 1]
        index += 2
        continue
      }
      if (char === quote) {
        closed = true
        index++
        break
      }
      key += char
      index++
    }
    if (!closed) {
      return { ok: false, error: 'JSONPath 语法错误：引号未闭合' }
    }
    index = skipSpaces(expression, index)
    if (expression[index] !== ']') {
      return { ok: false, error: 'JSONPath 语法错误：属性名后缺少 ]' }
    }
    return {
      ok: true,
      segment: { type: 'key', key, recursive: false },
      next: index + 1,
    }
  }

  if (expression[index] === '-') {
    return { ok: false, error: 'JSONPath 语法错误：数组索引不能为负数' }
  }

  const digitStart = index
  while (index < expression.length && /\d/.test(expression[index])) index++
  if (index === digitStart) {
    return {
      ok: false,
      error: "JSONPath 语法错误：括号内仅支持 [index]、['key'] 或 [*]",
    }
  }

  const parsedIndex = Number.parseInt(expression.slice(digitStart, index), 10)
  index = skipSpaces(expression, index)
  if (expression[index] !== ']') {
    return { ok: false, error: 'JSONPath 语法错误：数组索引后缺少 ]' }
  }
  return {
    ok: true,
    segment: { type: 'index', index: parsedIndex },
    next: index + 1,
  }
}

function readDotKey(
  expression: string,
  start: number
): { ok: true; key: string; next: number } | { ok: false; error: string } {
  let index = start
  while (
    index < expression.length &&
    expression[index] !== '.' &&
    expression[index] !== '['
  ) {
    index++
  }
  const key = expression.slice(start, index).trim()
  if (!key) {
    return { ok: false, error: 'JSONPath 语法错误：点号后缺少属性名' }
  }
  return { ok: true, key, next: index }
}

function parseJsonPath(expression: string): ParseSuccess | ParseFailure {
  const path = expression.trim()
  if (!path) {
    return { ok: false, error: '请输入 JSONPath 表达式，例如 $..name' }
  }
  if (path[0] !== '$') {
    return { ok: false, error: 'JSONPath 语法错误：表达式必须以 $ 开头' }
  }

  const segments: PathSegment[] = []
  let index = 1

  while (index < path.length) {
    const char = path[index]

    if (char === '.') {
      if (path[index + 1] === '.') {
        index += 2
        if (index >= path.length) {
          return { ok: false, error: 'JSONPath 语法错误：递归下降后缺少属性名' }
        }
        if (path[index] === '*') {
          segments.push({ type: 'wildcard', recursive: true })
          index++
          continue
        }
        if (path[index] === '[') {
          const bracket = parseBracket(path, index)
          if (!bracket.ok) return bracket
          index = bracket.next
          if (bracket.segment.type === 'index') {
            return {
              ok: false,
              error: 'JSONPath 语法错误：递归下降不支持数组索引，请使用 ..key 或 ..[*]',
            }
          }
          if (bracket.segment.type === 'key') {
            segments.push({
              type: 'key',
              key: bracket.segment.key,
              recursive: true,
            })
          } else {
            segments.push({ type: 'wildcard', recursive: true })
          }
          continue
        }
        const recursiveKey = readDotKey(path, index)
        if (!recursiveKey.ok) return recursiveKey
        segments.push({
          type: 'key',
          key: recursiveKey.key,
          recursive: true,
        })
        index = recursiveKey.next
        continue
      }

      index++
      if (path[index] === '*') {
        segments.push({ type: 'wildcard', recursive: false })
        index++
        continue
      }
      const key = readDotKey(path, index)
      if (!key.ok) return key
      segments.push({ type: 'key', key: key.key, recursive: false })
      index = key.next
      continue
    }

    if (char === '[') {
      const bracket = parseBracket(path, index)
      if (!bracket.ok) return bracket
      segments.push(bracket.segment)
      index = bracket.next
      continue
    }

    return {
      ok: false,
      error: `JSONPath 语法错误：位置 ${index + 1} 附近的字符 "${char}" 无法解析`,
    }
  }

  return { ok: true, segments }
}

function childValues(value: JsonValue): JsonValue[] {
  if (Array.isArray(value)) return value
  if (isJsonObject(value)) return Object.keys(value).map((key) => value[key])
  return []
}

function collectDescendants(value: JsonValue, output: JsonValue[]): JsonValue[] {
  childValues(value).forEach((child) => {
    output.push(child)
    collectDescendants(child, output)
  })
  return output
}

function selectPath(root: JsonValue, segments: PathSegment[]): JsonValue[] {
  let current: JsonValue[] = [root]

  segments.forEach((segment) => {
    const next: JsonValue[] = []

    current.forEach((node) => {
      if (segment.type === 'key') {
        if (segment.recursive) {
          const nodes = [node, ...collectDescendants(node, [])]
          nodes.forEach((candidate) => {
            if (
              isJsonObject(candidate) &&
              Object.prototype.hasOwnProperty.call(candidate, segment.key)
            ) {
              next.push(candidate[segment.key])
            }
          })
        } else if (
          isJsonObject(node) &&
          Object.prototype.hasOwnProperty.call(node, segment.key)
        ) {
          next.push(node[segment.key])
        }
        return
      }

      if (segment.type === 'index') {
        if (Array.isArray(node) && segment.index < node.length) {
          next.push(node[segment.index])
        }
        return
      }

      if (segment.recursive) {
        next.push(...collectDescendants(node, []))
      } else {
        next.push(...childValues(node))
      }
    })

    current = next
  })

  return current
}

export type JsonPathResult =
  | { ok: true; values: JsonValue[] }
  | { ok: false; error: string }

/**
 * 执行 JSONPath 查询
 * 支持 $、.key、['key']、[index]、[*]、..key、..[*]
 */
export function queryJsonPath(root: JsonValue, path: string): JsonPathResult {
  const parsed = parseJsonPath(path)
  if (!parsed.ok) return parsed
  return { ok: true, values: selectPath(root, parsed.segments) }
}
