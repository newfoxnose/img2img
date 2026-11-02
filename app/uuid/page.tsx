'use client'

import { useCallback, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['UUID v4', 'NanoID 风格', '随机密码', '本地生成']

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.?/'
const AMBIGUOUS = '0O1lI'
const DEFAULT_ALPHABET = `${UPPER}${LOWER}${DIGITS}_-`

const numberInputClass =
  'w-24 px-3 py-2 text-sm text-center rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const primaryButtonClass =
  'px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'
const secondaryButtonClass =
  'px-3 py-1.5 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
const checkboxClass = 'rounded border-gray-300 text-blue-600'

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

function CopyButton({
  text,
  label = '复制',
  disabled = false,
}: {
  text: string
  label?: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    if (!text) return
    if (await copyText(text)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      className={`${secondaryButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {copied ? '已复制' : label}
    </button>
  )
}

function randomInt(max: number): number {
  if (max <= 0) return 0
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0] % max
  }
  return Math.floor(Math.random() * max)
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return bytes
}

function uuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function randomString(length: number, alphabet: string): string {
  if (length <= 0 || alphabet.length === 0) return ''
  const chars: string[] = []
  for (let i = 0; i < length; i++) chars.push(alphabet[randomInt(alphabet.length)])
  return chars.join('')
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const temp = items[i]
    items[i] = items[j]
    items[j] = temp
  }
  return items
}

function clampInt(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function getPasswordPools(
  upper: boolean,
  lower: boolean,
  digits: boolean,
  symbols: boolean,
  excludeAmbiguous: boolean
): string[] {
  const pools: string[] = []
  if (upper) pools.push(UPPER)
  if (lower) pools.push(LOWER)
  if (digits) pools.push(DIGITS)
  if (symbols) pools.push(SYMBOLS)
  const filtered = excludeAmbiguous
    ? pools.map((pool) =>
        Array.from(pool)
          .filter((char) => !AMBIGUOUS.includes(char))
          .join('')
      )
    : pools
  return filtered.filter((pool) => pool.length > 0)
}

function getStrength(length: number, poolSize: number): {
  label: string
  tone: string
  bits: number
} {
  const bits = poolSize > 1 ? Math.round(length * Math.log2(poolSize)) : 0
  if (bits >= 128) return { label: '极强', tone: 'text-green-600 dark:text-green-400', bits }
  if (bits >= 80) return { label: '强', tone: 'text-emerald-600 dark:text-emerald-400', bits }
  if (bits >= 50) return { label: '中', tone: 'text-amber-600 dark:text-amber-400', bits }
  return { label: '弱', tone: 'text-red-600 dark:text-red-400', bits }
}

function ResultBlock({ items }: { items: string[] }) {
  return (
    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40">
      <pre className="font-mono text-sm break-all whitespace-pre-wrap text-gray-800 dark:text-gray-100">
        {items.join('\n')}
      </pre>
    </div>
  )
}

export default function UuidPage() {
  const [uuidCount, setUuidCount] = useState(5)
  const [uuids, setUuids] = useState<string[]>([])

  const [idLength, setIdLength] = useState(21)
  const [idCount, setIdCount] = useState(5)
  const [idCharset, setIdCharset] = useState(DEFAULT_ALPHABET)
  const [ids, setIds] = useState<string[]>([])
  const [idError, setIdError] = useState('')

  const [pwdLength, setPwdLength] = useState(16)
  const [pwdCount, setPwdCount] = useState(5)
  const [useUpper, setUseUpper] = useState(true)
  const [useLower, setUseLower] = useState(true)
  const [useDigits, setUseDigits] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false)
  const [passwords, setPasswords] = useState<string[]>([])
  const [passwordError, setPasswordError] = useState('')

  const passwordPools = getPasswordPools(
    useUpper,
    useLower,
    useDigits,
    useSymbols,
    excludeAmbiguous
  )
  const passwordPoolSize = passwordPools.join('').length
  const passwordStrength = getStrength(pwdLength, passwordPoolSize)

  const handleGenerateUuids = () => {
    const list: string[] = []
    for (let i = 0; i < uuidCount; i++) list.push(uuidV4())
    setUuids(list)
  }

  const handleGenerateIds = () => {
    const alphabet = Array.from(new Set(idCharset.replace(/\s/g, '').split(''))).join('')
    if (alphabet.length < 2) {
      setIdError('字符集至少需要包含 2 个不同的字符')
      setIds([])
      return
    }
    const list: string[] = []
    for (let i = 0; i < idCount; i++) list.push(randomString(idLength, alphabet))
    setIdError('')
    setIds(list)
  }

  const handleGeneratePasswords = () => {
    const pools = getPasswordPools(
      useUpper,
      useLower,
      useDigits,
      useSymbols,
      excludeAmbiguous
    )
    if (pools.length === 0) {
      setPasswordError('请至少勾选一种字符类型')
      setPasswords([])
      return
    }
    const all = pools.join('')
    const list: string[] = []
    for (let i = 0; i < pwdCount; i++) {
      const chars: string[] = []
      for (const pool of pools) {
        if (chars.length < pwdLength) chars.push(randomString(1, pool))
      }
      while (chars.length < pwdLength) chars.push(randomString(1, all))
      list.push(shuffle(chars).join(''))
    }
    setPasswordError('')
    setPasswords(list)
  }

  return (
    <div>
      <ToolHeader
        title="UUID / 随机密码"
        description="批量生成 UUID v4、NanoID 风格随机 ID 与随机密码，可自由配置长度和字符集，全部在浏览器本地生成"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* UUID v4 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">UUID v4</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  优先使用 crypto.randomUUID，不支持时使用 crypto.getRandomValues 手写生成
                </p>
              </div>
              <CopyButton text={uuids.join('\n')} label="复制全部" disabled={uuids.length === 0} />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label
                  htmlFor="uuid-count"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  生成数量（1-50）
                </label>
                <input
                  id="uuid-count"
                  type="number"
                  min={1}
                  max={50}
                  value={uuidCount}
                  onChange={(event) => setUuidCount(clampInt(event.target.value, 1, 50, 5))}
                  className={numberInputClass}
                />
              </div>
              <button type="button" onClick={handleGenerateUuids} className={primaryButtonClass}>
                生成 UUID
              </button>
            </div>

            {uuids.length > 0 ? (
              <ResultBlock items={uuids} />
            ) : (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                点击“生成 UUID”按钮后在此显示结果。
              </p>
            )}
          </section>

          {/* 随机 ID */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  NanoID 风格随机 ID
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  长度 4-64，默认字符集 A-Za-z0-9_-
                </p>
              </div>
              <CopyButton text={ids.join('\n')} label="复制全部" disabled={ids.length === 0} />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="id-length"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    长度
                  </label>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{idLength}</span>
                </div>
                <input
                  id="id-length"
                  type="range"
                  min={4}
                  max={64}
                  value={idLength}
                  onChange={(event) => setIdLength(Number(event.target.value))}
                  className="mt-1 w-full accent-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="id-charset"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  字符集
                </label>
                <input
                  id="id-charset"
                  type="text"
                  value={idCharset}
                  onChange={(event) => setIdCharset(event.target.value)}
                  spellCheck={false}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="id-count"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    生成数量（1-50）
                  </label>
                  <input
                    id="id-count"
                    type="number"
                    min={1}
                    max={50}
                    value={idCount}
                    onChange={(event) => setIdCount(clampInt(event.target.value, 1, 50, 5))}
                    className={numberInputClass}
                  />
                </div>
                <button type="button" onClick={handleGenerateIds} className={primaryButtonClass}>
                  生成随机 ID
                </button>
              </div>

              {idError && (
                <p className="text-sm text-red-600 dark:text-red-400">{idError}</p>
              )}

              {ids.length > 0 ? (
                <ResultBlock items={ids} />
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  点击“生成随机 ID”按钮后在此显示结果。
                </p>
              )}
            </div>
          </section>

          {/* 随机密码 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">随机密码</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  长度 4-128，可组合大小写字母、数字与符号
                </p>
              </div>
              <CopyButton
                text={passwords.join('\n')}
                label="复制全部"
                disabled={passwords.length === 0}
              />
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="pwd-length"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    密码长度
                  </label>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-300">{pwdLength}</span>
                </div>
                <input
                  id="pwd-length"
                  type="range"
                  min={4}
                  max={128}
                  value={pwdLength}
                  onChange={(event) => setPwdLength(Number(event.target.value))}
                  className="mt-1 w-full accent-blue-600"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">字符类型</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useUpper}
                      onChange={(event) => setUseUpper(event.target.checked)}
                      className={checkboxClass}
                    />
                    大写字母 A-Z
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useLower}
                      onChange={(event) => setUseLower(event.target.checked)}
                      className={checkboxClass}
                    />
                    小写字母 a-z
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useDigits}
                      onChange={(event) => setUseDigits(event.target.checked)}
                      className={checkboxClass}
                    />
                    数字 0-9
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useSymbols}
                      onChange={(event) => setUseSymbols(event.target.checked)}
                      className={checkboxClass}
                    />
                    符号
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={excludeAmbiguous}
                      onChange={(event) => setExcludeAmbiguous(event.target.checked)}
                      className={checkboxClass}
                    />
                    排除易混淆字符（0O1lI）
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40">
                {passwordPools.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    请至少勾选一种字符类型，否则无法生成密码。
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    预计强度：
                    <span className={`font-semibold ${passwordStrength.tone}`}>
                      {passwordStrength.label}
                    </span>
                    <span className="ml-2 text-gray-500 dark:text-gray-400">
                      约 {passwordStrength.bits} bit · {pwdLength} 位 · 字符种类 {passwordPools.length} 类
                    </span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="pwd-count"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    生成数量（1-20）
                  </label>
                  <input
                    id="pwd-count"
                    type="number"
                    min={1}
                    max={20}
                    value={pwdCount}
                    onChange={(event) => setPwdCount(clampInt(event.target.value, 1, 20, 5))}
                    className={numberInputClass}
                  />
                </div>
                <button type="button" onClick={handleGeneratePasswords} className={primaryButtonClass}>
                  生成密码
                </button>
              </div>

              {passwordError && (
                <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
              )}

              {passwords.length > 0 ? (
                <ResultBlock items={passwords} />
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  点击“生成密码”按钮后在此显示结果。
                </p>
              )}
            </div>
          </section>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 建议使用密码管理器保存生成的密码，避免在公共设备上明文留存。</p>
            <p>2. 勾选“排除易混淆字符”会从字符集中移除 0、O、1、l、I，便于人工输入。</p>
            <p>3. 所有内容均由浏览器本地随机生成，不会上传到服务器。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
