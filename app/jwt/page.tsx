'use client'

import { useCallback, useMemo, useState } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'

const features = ['Header 解码', 'Payload 解码', '时间状态', '本地处理']

const primaryButtonClass =
  'px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors'
const secondaryButtonClass =
  'px-3 py-1.5 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
const codeBlockClass =
  'max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm break-all whitespace-pre-wrap text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-100'

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

function decodeBase64Url(segment: string): string {
  let normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const remainder = normalized.length % 4
  if (remainder === 1) throw new Error('Base64URL 长度非法')
  if (remainder === 2) normalized += '=='
  else if (remainder === 3) normalized += '='
  const binary = atob(normalized)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function base64UrlEncode(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

interface DecodedJwt {
  header?: unknown
  payload?: unknown
  error: string
}

function decodeJwt(token: string): DecodedJwt {
  const trimmed = token.trim()
  if (!trimmed) return { error: '' }
  const parts = trimmed.split('.')
  if (parts.length !== 3) {
    return { error: 'JWT 格式错误：应为 header.payload.signature 三段，用英文句点分隔' }
  }
  if (!parts[0] || !parts[1] || !parts[2]) {
    return { error: 'JWT 格式错误：header、payload、signature 三段都不能为空' }
  }
  let header: unknown
  let payload: unknown
  try {
    header = JSON.parse(decodeBase64Url(parts[0]))
  } catch {
    return { error: 'Header 解析失败：不是合法的 Base64URL 或 JSON' }
  }
  try {
    payload = JSON.parse(decodeBase64Url(parts[1]))
  } catch {
    return { error: 'Payload 解析失败：不是合法的 Base64URL 或 JSON' }
  }
  return { header, payload, error: '' }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function formatSeconds(seconds: number): { local: string; utc: string } {
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return { local: '无效时间', utc: '无效时间' }
  return {
    local: date.toLocaleString('zh-CN', { hour12: false }),
    utc: date.toISOString(),
  }
}

const TONE = {
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  valid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

interface TimeRow {
  key: string
  label: string
  seconds: number
  status: string
  tone: string
  local: string
  utc: string
}

function getTimeRows(payload: unknown, now: number): TimeRow[] {
  if (!isRecord(payload)) return []
  const rows: TimeRow[] = []
  const definitions: { key: 'iat' | 'exp' | 'nbf'; label: string }[] = [
    { key: 'iat', label: '签发时间 iat' },
    { key: 'exp', label: '过期时间 exp' },
    { key: 'nbf', label: '生效时间 nbf' },
  ]
  for (const definition of definitions) {
    const seconds = payload[definition.key]
    if (typeof seconds !== 'number' || !Number.isFinite(seconds)) continue
    let status = '签发时间'
    let tone = TONE.neutral
    if (definition.key === 'exp') {
      const expired = seconds * 1000 < now
      status = expired ? '已过期' : '有效'
      tone = expired ? TONE.expired : TONE.valid
    } else if (definition.key === 'nbf') {
      const pending = seconds * 1000 > now
      status = pending ? '未生效' : '有效'
      tone = pending ? TONE.pending : TONE.valid
    }
    const formatted = formatSeconds(seconds)
    rows.push({
      key: definition.key,
      label: definition.label,
      seconds,
      status,
      tone,
      local: formatted.local,
      utc: formatted.utc,
    })
  }
  return rows
}

function getOverallStatus(payload: unknown, now: number): { label: string; tone: string } | null {
  if (!isRecord(payload)) return null
  const exp = typeof payload.exp === 'number' ? payload.exp : null
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : null
  if (exp === null && nbf === null) return null
  if (exp !== null && exp * 1000 < now) return { label: '已过期', tone: TONE.expired }
  if (nbf !== null && nbf * 1000 > now) return { label: '未生效', tone: TONE.pending }
  return { label: '有效', tone: TONE.valid }
}

function buildSampleToken(): string {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: 'trae-tools',
    sub: '1234567890',
    name: '张三',
    admin: true,
    iat: now,
    exp: now + 3600,
  }
  return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.c2lnbmF0dXJlLWRlbW8`
}

export default function JwtPage() {
  const [token, setToken] = useState('')

  const decoded = useMemo(() => decodeJwt(token), [token])
  const headerText = decoded.header === undefined ? '' : formatJson(decoded.header)
  const payloadText = decoded.payload === undefined ? '' : formatJson(decoded.payload)

  const timeInfo = useMemo(() => {
    const now = Date.now()
    const payload = decoded.payload
    return {
      rows: getTimeRows(payload, now),
      overall: getOverallStatus(payload, now),
      isObject: isRecord(payload),
      hasPayload: payload !== undefined,
    }
  }, [decoded.payload])

  return (
    <div>
      <ToolHeader
        title="JWT 解析"
        description="实时解析 JWT 的 Header 与 Payload，查看签发、过期、生效时间与当前状态，Token 仅在浏览器本地解码"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* 输入 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">JWT Token</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  粘贴以 aaa.bbb.ccc 三段格式组成的 JWT，输入后自动解析
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setToken(buildSampleToken())}
                  className={primaryButtonClass}
                >
                  加载示例
                </button>
                <button
                  type="button"
                  onClick={() => setToken('')}
                  className={secondaryButtonClass}
                >
                  清空
                </button>
              </div>
            </div>

            <label htmlFor="jwt-input" className="sr-only">
              输入 JWT Token
            </label>
            <textarea
              id="jwt-input"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature"
              spellCheck={false}
              className="w-full h-32 p-4 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y break-all focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />

            {decoded.error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{decoded.error}</p>
            )}
          </section>

          {/* Header / Payload */}
          <div className="grid gap-5 md:grid-cols-2">
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Header</h2>
                <CopyButton text={headerText} disabled={!headerText} />
              </div>
              {headerText ? (
                <pre className={codeBlockClass}>{headerText}</pre>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无 Header 数据</p>
              )}
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payload</h2>
                <CopyButton text={payloadText} label="复制 Payload JSON" disabled={!payloadText} />
              </div>
              {payloadText ? (
                <pre className={codeBlockClass}>{payloadText}</pre>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">暂无 Payload 数据</p>
              )}
            </section>
          </div>

          {/* 时间信息 */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">时间信息</h2>
              {timeInfo.overall && (
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${timeInfo.overall.tone}`}>
                  {timeInfo.overall.label}
                </span>
              )}
            </div>

            {timeInfo.rows.length > 0 ? (
              <div className="space-y-3">
                {timeInfo.rows.map((row) => (
                  <div
                    key={row.key}
                    className="rounded-lg border border-gray-100 p-3 dark:border-gray-700"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {row.label}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${row.tone}`}>
                        {row.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {row.seconds}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      本地时间：<span className="font-mono">{row.local}</span>
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      UTC 时间：<span className="font-mono break-all">{row.utc}</span>
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {!timeInfo.hasPayload
                  ? '暂无 Payload 数据，输入 JWT 后显示时间信息。'
                  : timeInfo.isObject
                    ? 'Payload 中未包含 exp / iat / nbf 时间字段。'
                    : 'Payload 不是 JSON 对象，无法提取时间字段。'}
              </p>
            )}
          </section>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-5 text-sm text-amber-800 dark:text-amber-200 space-y-2">
            <p className="font-medium">安全提示</p>
            <p>1. 本工具仅做 Base64URL 解码，不验证签名，也不能确认 Token 是否被篡改，请勿用于安全校验。</p>
            <p>2. 解码结果不代表 Token 有效，服务端仍应校验签名、算法、签发者与过期时间。</p>
            <p>3. 请勿在公共设备上粘贴生产环境的真实 Token，避免泄露敏感信息。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
