/**
 * 行级文本差异对比
 * 供文本对比工具与 JSON 同屏对比复用
 */

export type DiffType = 'equal' | 'change' | 'add' | 'remove'

export interface DiffRow {
  type: DiffType
  left: string | null
  right: string | null
  leftLine: number | null
  rightLine: number | null
}

export interface DiffOptions {
  ignoreCase?: boolean
  ignoreWhitespace?: boolean
}

export interface DiffResult {
  rows: DiffRow[]
  added: number
  removed: number
  changed: number
  truncated: boolean
}

const MAX_LINES = 3000
const MAX_CELLS = 4_000_000

function normalize(line: string, options: DiffOptions): string {
  let value = line
  if (options.ignoreWhitespace) {
    value = value.trim().replace(/\s+/g, ' ')
  }
  if (options.ignoreCase) {
    value = value.toLowerCase()
  }
  return value
}

/**
 * 计算两个文本的行级差异
 * 行数过多时退化为逐行比较，避免页面卡死
 */
export function diffLines(
  leftText: string,
  rightText: string,
  options: DiffOptions = {}
): DiffResult {
  const leftLines = leftText.split('\n')
  const rightLines = rightText.split('\n')

  const leftKeys = leftLines.map((line) => normalize(line, options))
  const rightKeys = rightLines.map((line) => normalize(line, options))

  const truncated =
    leftLines.length > MAX_LINES ||
    rightLines.length > MAX_LINES ||
    leftLines.length * rightLines.length > MAX_CELLS

  if (truncated) {
    const rows: DiffRow[] = []
    let added = 0
    let removed = 0
    let changed = 0
    const max = Math.max(leftLines.length, rightLines.length)

    for (let i = 0; i < max; i++) {
      const left = i < leftLines.length ? leftLines[i] : null
      const right = i < rightLines.length ? rightLines[i] : null

      if (left !== null && right !== null) {
        if (leftKeys[i] === rightKeys[i]) {
          rows.push({ type: 'equal', left, right, leftLine: i + 1, rightLine: i + 1 })
        } else {
          changed++
          rows.push({ type: 'change', left, right, leftLine: i + 1, rightLine: i + 1 })
        }
      } else if (left !== null) {
        removed++
        rows.push({ type: 'remove', left, right: null, leftLine: i + 1, rightLine: null })
      } else if (right !== null) {
        added++
        rows.push({ type: 'add', left: null, right, leftLine: null, rightLine: i + 1 })
      }
    }

    return { rows, added, removed, changed, truncated }
  }

  // LCS 动态规划
  const n = leftLines.length
  const m = rightLines.length
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] =
        leftKeys[i] === rightKeys[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1])
    }
  }

  const rawRows: DiffRow[] = []
  let i = 0
  let j = 0

  while (i < n && j < m) {
    if (leftKeys[i] === rightKeys[j]) {
      rawRows.push({ type: 'equal', left: leftLines[i], right: rightLines[j], leftLine: i + 1, rightLine: j + 1 })
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      rawRows.push({ type: 'remove', left: leftLines[i], right: null, leftLine: i + 1, rightLine: null })
      i++
    } else {
      rawRows.push({ type: 'add', left: null, right: rightLines[j], leftLine: null, rightLine: j + 1 })
      j++
    }
  }

  while (i < n) {
    rawRows.push({ type: 'remove', left: leftLines[i], right: null, leftLine: i + 1, rightLine: null })
    i++
  }
  while (j < m) {
    rawRows.push({ type: 'add', left: null, right: rightLines[j], leftLine: null, rightLine: j + 1 })
    j++
  }

  // 将相邻的删除/新增合并成变更行，便于左右对照展示
  const rows: DiffRow[] = []
  let added = 0
  let removed = 0
  let changed = 0
  let index = 0

  while (index < rawRows.length) {
    const row = rawRows[index]
    if (row.type !== 'remove' && row.type !== 'add') {
      rows.push(row)
      index++
      continue
    }

    const removes: DiffRow[] = []
    const adds: DiffRow[] = []
    while (index < rawRows.length && (rawRows[index].type === 'remove' || rawRows[index].type === 'add')) {
      if (rawRows[index].type === 'remove') removes.push(rawRows[index])
      else adds.push(rawRows[index])
      index++
    }

    const pairCount = Math.min(removes.length, adds.length)
    for (let k = 0; k < pairCount; k++) {
      changed++
      rows.push({
        type: 'change',
        left: removes[k].left,
        right: adds[k].right,
        leftLine: removes[k].leftLine,
        rightLine: adds[k].rightLine,
      })
    }
    for (let k = pairCount; k < removes.length; k++) {
      removed++
      rows.push(removes[k])
    }
    for (let k = pairCount; k < adds.length; k++) {
      added++
      rows.push(adds[k])
    }
  }

  return { rows, added, removed, changed, truncated }
}
