'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'
import { evaluateExpression, formatNumber, type AngleMode } from '@/utils/calc'

const features = ['四则运算', '科学函数', '键盘输入', '历史记录']

interface HistoryItem {
  expr: string
  result: string
}

type KeyVariant = 'digit' | 'operator' | 'fn' | 'equal'

const VARIANT_CLASS: Record<KeyVariant, string> = {
  digit:
    'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600',
  operator:
    'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50',
  fn:
    'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/40 dark:text-gray-200 dark:hover:bg-gray-900/70',
  equal: 'bg-blue-600 text-white hover:bg-blue-700',
}

function KeyButton({
  variant = 'digit',
  onClick,
  children,
  className = '',
  ariaLabel,
}: {
  variant?: KeyVariant
  onClick: () => void
  children: React.ReactNode
  className?: string
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`h-12 md:h-14 rounded-lg text-lg font-medium transition-colors select-none ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/** 科学模式按键 */
const SCIENTIFIC_KEYS: { label: string; insert: string; ariaLabel?: string }[] = [
  { label: 'sin', insert: 'sin(' },
  { label: 'cos', insert: 'cos(' },
  { label: 'tan', insert: 'tan(' },
  { label: 'π', insert: 'π', ariaLabel: '圆周率' },
  { label: 'asin', insert: 'asin(' },
  { label: 'acos', insert: 'acos(' },
  { label: 'atan', insert: 'atan(' },
  { label: 'e', insert: 'e', ariaLabel: '自然常数 e' },
  { label: 'ln', insert: 'ln(' },
  { label: 'log', insert: 'log(' },
  { label: '√', insert: 'sqrt(', ariaLabel: '平方根' },
  { label: '^', insert: '^', ariaLabel: '幂运算' },
]

export default function CalculatorPage() {
  const [expr, setExpr] = useState('')
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [angle, setAngle] = useState<AngleMode>('deg')
  const [scientific, setScientific] = useState(false)
  const [justEvaluated, setJustEvaluated] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const preview = useMemo(() => {
    if (!expr.trim()) return null
    try {
      return formatNumber(evaluateExpression(expr, angle))
    } catch {
      return null
    }
  }, [expr, angle])

  const append = useCallback(
    (token: string) => {
      setError('')
      setExpr((prev) =>
        justEvaluated && /^[0-9.(]$/.test(token) ? token : prev + token
      )
      setJustEvaluated(false)
    },
    [justEvaluated]
  )

  const backspace = useCallback(() => {
    setError('')
    setJustEvaluated(false)
    setExpr((prev) => prev.slice(0, -1))
  }, [])

  const clearAll = useCallback(() => {
    setExpr('')
    setError('')
    setJustEvaluated(false)
  }, [])

  const commit = useCallback(() => {
    const trimmed = expr.trim()
    if (!trimmed) return
    try {
      const result = formatNumber(evaluateExpression(trimmed, angle))
      setExpr(result)
      setJustEvaluated(true)
      setError('')
      setHistory((prev) => {
        const rest = prev.filter(
          (item) => !(item.expr === trimmed && item.result === result)
        )
        return [{ expr: trimmed, result }, ...rest].slice(0, 30)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法计算该表达式')
    }
  }, [expr, angle])

  const reuseHistory = useCallback((item: HistoryItem) => {
    setExpr(item.result)
    setJustEvaluated(true)
    setError('')
  }, [])

  const copyResult = useCallback(async () => {
    if (!preview) return
    try {
      await navigator.clipboard.writeText(preview)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }, [preview])

  // 键盘输入
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key
      if (/^[0-9.]$/.test(key) || ['+', '-', '*', '/', '%', '^', '(', ')'].includes(key)) {
        event.preventDefault()
        append(key)
        return
      }
      if (key === 'Enter' || key === '=') {
        event.preventDefault()
        commit()
        return
      }
      if (key === 'Backspace') {
        event.preventDefault()
        backspace()
        return
      }
      if (key === 'Escape' || key === 'Delete') {
        event.preventDefault()
        clearAll()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [append, backspace, clearAll, commit])

  return (
    <div>
      <ToolHeader
        title="计算器"
        description="基础四则运算与科学计算，支持括号、百分号、三角函数与对数，可用键盘直接输入，计算记录一键复用"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* 计算器主体 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">计算器</h2>
              <div className="flex items-center gap-2">
                {scientific && (
                  <button
                    type="button"
                    onClick={() => setAngle((prev) => (prev === 'deg' ? 'rad' : 'deg'))}
                    title="切换角度单位"
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {angle === 'deg' ? 'DEG 角度' : 'RAD 弧度'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setScientific((prev) => !prev)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    scientific
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  科学模式
                </button>
              </div>
            </div>

            {/* 显示区 */}
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-right">
              <div className="min-h-[36px] text-2xl md:text-3xl font-mono text-gray-900 dark:text-white break-all">
                {expr || '0'}
              </div>
              <div className="mt-1 min-h-[22px] flex items-center justify-end gap-2 text-sm font-mono">
                {error ? (
                  <span className="text-red-600 dark:text-red-400">{error}</span>
                ) : preview !== null && preview !== expr ? (
                  <>
                    <span className="text-gray-500 dark:text-gray-400 break-all">= {preview}</span>
                    <button
                      type="button"
                      onClick={copyResult}
                      className="shrink-0 px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400"
                    >
                      {copied ? '已复制' : '复制'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {/* 科学按键 */}
            {scientific && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {SCIENTIFIC_KEYS.map((key) => (
                  <KeyButton
                    key={key.label}
                    variant="fn"
                    ariaLabel={key.ariaLabel}
                    onClick={() => append(key.insert)}
                    className="!text-base"
                  >
                    {key.label}
                  </KeyButton>
                ))}
              </div>
            )}

            {/* 基础按键 */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <KeyButton variant="fn" onClick={clearAll} ariaLabel="清空">
                AC
              </KeyButton>
              <KeyButton variant="fn" onClick={backspace} ariaLabel="退格">
                ⌫
              </KeyButton>
              <KeyButton variant="fn" onClick={() => append('%')} ariaLabel="百分号">
                %
              </KeyButton>
              <KeyButton variant="operator" onClick={() => append('/')} ariaLabel="除">
                ÷
              </KeyButton>

              {['7', '8', '9'].map((digit) => (
                <KeyButton key={digit} onClick={() => append(digit)}>
                  {digit}
                </KeyButton>
              ))}
              <KeyButton variant="operator" onClick={() => append('*')} ariaLabel="乘">
                ×
              </KeyButton>

              {['4', '5', '6'].map((digit) => (
                <KeyButton key={digit} onClick={() => append(digit)}>
                  {digit}
                </KeyButton>
              ))}
              <KeyButton variant="operator" onClick={() => append('-')} ariaLabel="减">
                −
              </KeyButton>

              {['1', '2', '3'].map((digit) => (
                <KeyButton key={digit} onClick={() => append(digit)}>
                  {digit}
                </KeyButton>
              ))}
              <KeyButton variant="operator" onClick={() => append('+')} ariaLabel="加">
                +
              </KeyButton>

              <KeyButton onClick={() => append('(')} ariaLabel="左括号">
                (
              </KeyButton>
              <KeyButton onClick={() => append(')')} ariaLabel="右括号">
                )
              </KeyButton>
              <KeyButton onClick={() => append('0')}>0</KeyButton>
              <KeyButton onClick={() => append('.')} ariaLabel="小数点">
                .
              </KeyButton>

              <KeyButton variant="equal" onClick={commit} className="col-span-4" ariaLabel="计算结果">
                =
              </KeyButton>
            </div>
          </div>

          {/* 右侧：历史记录与说明 */}
          <div className="space-y-5">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">历史记录</h2>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  >
                    清空记录
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  按 = 或回车后，计算记录会显示在这里，点击任意记录可复用结果。
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[420px] overflow-y-auto">
                  {history.map((item, index) => (
                    <li key={`${item.expr}-${index}`}>
                      <button
                        type="button"
                        onClick={() => reuseHistory(item)}
                        className="w-full text-left py-2.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <div className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">
                          {item.expr} =
                        </div>
                        <div className="text-base font-mono text-gray-900 dark:text-white break-all">
                          {item.result}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>1. 支持 + − × ÷、幂运算 ^、括号与隐式乘法，例如 2(3+4)、3pi、2sin(30)。</p>
              <p>2. 百分号按“除以 100”计算，如 200×15% = 30。</p>
              <p>3. 科学模式下可切换 DEG（角度）/ RAD（弧度），三角函数与反三角函数随之换算。</p>
              <p>4. 键盘可直接输入数字与运算符，回车计算结果，退格删除，Esc 清空。</p>
              <p>5. 所有计算在浏览器本地完成，不会上传任何数据。</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
