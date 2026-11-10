/**
 * 计算器表达式求值器（不使用 eval）
 *
 * 支持：
 * - 四则运算 + - * /、幂 ^、百分比 %
 * - 括号与隐式乘法（如 2(3+4)、3pi、2sin(30)）
 * - 常用函数：sin/cos/tan/asin/acos/atan/ln/log/sqrt/abs/exp
 * - 常量：pi、e
 * - 三角函数按 DEG/RAD 角度模式换算
 */

export type AngleMode = 'deg' | 'rad'

type Operator = '+' | '-' | '*' | '/' | '^' | '%' | '(' | ')'

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; name: string }
  | { type: 'op'; op: Operator }

const OPERATOR_CHARS = '+-*/^%()'

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
}

type MathFn = (value: number, angle: AngleMode) => number

/** 三角函数在 DEG 模式下先转弧度，反三角函数输出再转回角度 */
const toRadians = (value: number, angle: AngleMode): number =>
  angle === 'deg' ? (value * Math.PI) / 180 : value

const fromRadians = (value: number, angle: AngleMode): number =>
  angle === 'deg' ? (value * 180) / Math.PI : value

const FUNCTIONS: Record<string, MathFn> = {
  sin: (value, angle) => Math.sin(toRadians(value, angle)),
  cos: (value, angle) => Math.cos(toRadians(value, angle)),
  tan: (value, angle) => Math.tan(toRadians(value, angle)),
  asin: (value, angle) => fromRadians(Math.asin(value), angle),
  acos: (value, angle) => fromRadians(Math.acos(value), angle),
  atan: (value, angle) => fromRadians(Math.atan(value), angle),
  ln: (value) => Math.log(value),
  log: (value) => Math.log10(value),
  sqrt: (value) => Math.sqrt(value),
  abs: (value) => Math.abs(value),
  exp: (value) => Math.exp(value),
}

/** 全角/数学符号统一为普通符号，便于解析 */
function normalize(input: string): string {
  return input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
}

function tokenize(input: string): Token[] {
  const text = normalize(input)
  const tokens: Token[] = []
  let index = 0

  while (index < text.length) {
    const char = text[index]

    if (/\s/.test(char)) {
      index++
      continue
    }

    if (/[0-9.]/.test(char)) {
      let end = index
      let hasDot = false
      while (end < text.length && /[0-9.]/.test(text[end])) {
        if (text[end] === '.') {
          if (hasDot) throw new Error('数字格式错误')
          hasDot = true
        }
        end++
      }
      // 科学计数法：1e3、1E-3
      if (end < text.length && /[eE]/.test(text[end])) {
        let expEnd = end + 1
        if (expEnd < text.length && (text[expEnd] === '+' || text[expEnd] === '-')) {
          expEnd++
        }
        if (expEnd < text.length && /[0-9]/.test(text[expEnd])) {
          while (expEnd < text.length && /[0-9]/.test(text[expEnd])) expEnd++
          end = expEnd
        }
      }
      const raw = text.slice(index, end)
      const value = Number(raw)
      if (!Number.isFinite(value)) throw new Error('数字格式错误')
      tokens.push({ type: 'num', value })
      index = end
      continue
    }

    if (/[a-zA-Z]/.test(char)) {
      let end = index
      while (end < text.length && /[a-zA-Z]/.test(text[end])) end++
      tokens.push({ type: 'ident', name: text.slice(index, end).toLowerCase() })
      index = end
      continue
    }

    if (OPERATOR_CHARS.indexOf(char) >= 0) {
      tokens.push({ type: 'op', op: char as Operator })
      index++
      continue
    }

    throw new Error(`不支持的字符：${char}`)
  }

  return tokens
}

/**
 * 递归下降解析，优先级由低到高：
 * 加减 → 乘除/隐式乘 → 正负号 → 幂（右结合）→ 后缀百分号 → 括号/数字/函数
 */
class Parser {
  private tokens: Token[]
  private angle: AngleMode
  private index = 0

  constructor(tokens: Token[], angle: AngleMode) {
    this.tokens = tokens
    this.angle = angle
  }

  parse(): number {
    if (this.tokens.length === 0) throw new Error('表达式为空')
    const value = this.parseExpression()
    if (this.index < this.tokens.length) throw new Error('表达式格式错误')
    return value
  }

  private peek(): Token | undefined {
    return this.tokens[this.index]
  }

  private eatOperator(...operators: Operator[]): Operator | null {
    const token = this.peek()
    if (token && token.type === 'op' && operators.indexOf(token.op) >= 0) {
      this.index++
      return token.op
    }
    return null
  }

  private parseExpression(): number {
    let value = this.parseTerm()
    for (;;) {
      const op = this.eatOperator('+', '-')
      if (!op) return value
      const right = this.parseTerm()
      value = op === '+' ? value + right : value - right
    }
  }

  private parseTerm(): number {
    let value = this.parseUnary()
    for (;;) {
      const op = this.eatOperator('*', '/')
      if (op) {
        const right = this.parseUnary()
        value = op === '*' ? value * right : value / right
        continue
      }
      // 隐式乘法：2(3+4)、3pi、2sin(30)
      const token = this.peek()
      const startsValue =
        token &&
        (token.type === 'num' ||
          token.type === 'ident' ||
          (token.type === 'op' && token.op === '('))
      if (startsValue) {
        value *= this.parseUnary()
        continue
      }
      return value
    }
  }

  private parseUnary(): number {
    if (this.eatOperator('+')) return this.parseUnary()
    if (this.eatOperator('-')) return -this.parseUnary()
    return this.parsePower()
  }

  private parsePower(): number {
    const base = this.parsePostfix()
    if (this.eatOperator('^')) {
      // 右结合，指数一侧允许带符号：2^-3
      return Math.pow(base, this.parseUnary())
    }
    return base
  }

  private parsePostfix(): number {
    let value = this.parsePrimary()
    while (this.eatOperator('%')) value /= 100
    return value
  }

  private parsePrimary(): number {
    const token = this.peek()
    if (!token) throw new Error('表达式不完整')

    if (token.type === 'num') {
      this.index++
      return token.value
    }

    if (token.type === 'op' && token.op === '(') {
      this.index++
      const value = this.parseExpression()
      if (!this.eatOperator(')')) throw new Error('括号未闭合')
      return value
    }

    if (token.type === 'ident') {
      this.index++
      const name = token.name

      if (Object.prototype.hasOwnProperty.call(CONSTANTS, name)) {
        return CONSTANTS[name]
      }

      const fn = FUNCTIONS[name]
      if (!fn) throw new Error(`未知函数或常量：${name}`)

      const next = this.peek()
      let argument: number
      if (next && next.type === 'op' && next.op === '(') {
        this.index++
        argument = this.parseExpression()
        if (!this.eatOperator(')')) throw new Error('括号未闭合')
      } else {
        // 省略括号：sin30、sqrt9
        argument = this.parseUnary()
      }
      return fn(argument, this.angle)
    }

    throw new Error('表达式格式错误')
  }
}

/** 计算表达式结果，失败时抛出 Error */
export function evaluateExpression(input: string, angle: AngleMode = 'deg'): number {
  const tokens = tokenize(input)
  const value = new Parser(tokens, angle).parse()
  if (!Number.isFinite(value)) throw new Error('结果不是有限数值')
  return value
}

/** 结果格式化：去掉浮点尾巴，极大/极小值用科学计数法 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error('结果不是有限数值')
  const rounded = Number(value.toPrecision(12))
  if (Object.is(rounded, -0)) return '0'
  const abs = Math.abs(rounded)
  if (abs !== 0 && (abs < 1e-9 || abs >= 1e12)) {
    return rounded.toExponential(8).replace(/\.?0+e/, 'e')
  }
  return String(rounded)
}
