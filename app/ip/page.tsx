'use client'

import { useState, useEffect, useCallback } from 'react'
import ToolHeader from '@/components/shared/ToolHeader'
import Footer from '@/components/shared/Footer'
import { parseUserAgent } from '@/lib/user-agent'

const features = ['本地 IP 列表', '公网 IP', 'IPv4 / IPv6', '归属地查询', '浏览器设备信息']

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [text])
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors shrink-0 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-0 dark:border-gray-700">
      <span className="text-sm text-gray-500 shrink-0 w-20 dark:text-gray-400">{label}</span>
      <code className="flex-1 text-sm font-mono text-gray-900 break-all text-right dark:text-gray-100">
        {value || '—'}
      </code>
      {value ? <CopyButton text={value} /> : null}
    </div>
  )
}

/** 通过 WebRTC 获取本机局域网 IP（含 IPv4 / IPv6） */
function getLocalIps(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips = new Set<string>()
    const RTCPeerConnectionCtor =
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection

    if (!RTCPeerConnectionCtor) {
      resolve([])
      return
    }

    const pc = new RTCPeerConnectionCtor({ iceServers: [] })
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        pc.close()
      } catch {
        // 忽略关闭异常
      }
      resolve(Array.from(ips))
    }

    const timer = setTimeout(finish, 2000)

    try {
      pc.createDataChannel('')
    } catch {
      finish()
      return
    }

    pc.onicecandidate = (event: any) => {
      if (!event.candidate) {
        finish()
        return
      }
      const candidate: string = event.candidate.candidate
      const ipv4 = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/)
      const ipv6 = candidate.match(/([0-9a-f]{1,4}(?::[0-9a-f]{1,4}){2,7})/i)

      if (ipv4) {
        const ip = ipv4[1]
        if (ip !== '0.0.0.0' && !ip.startsWith('255.')) {
          ips.add(ip)
        }
      }
      if (ipv6) {
        const ip = ipv6[1].toLowerCase()
        if (ip !== '::' && ip !== '::1') {
          ips.add(ip)
        }
      }
    }

    pc.createOffer()
      .then((offer: any) => pc.setLocalDescription(offer))
      .catch(() => finish())
  })
}

function isPrivateIp(ip: string): boolean {
  if (ip.indexOf(':') >= 0) {
    const lower = ip.toLowerCase()
    return (
      lower === '::1' ||
      lower.startsWith('fe80') ||
      lower.startsWith('fc') ||
      lower.startsWith('fd')
    )
  }
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => isNaN(part))) return false
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 169 && parts[1] === 254)
  )
}

function sortLocalIps(ips: string[]): string[] {
  const rank = (ip: string) => (isPrivateIp(ip) ? 0 : 1)
  return ips.slice().sort((a, b) => rank(a) - rank(b))
}

function ipVersion(ip: string): 'IPv4' | 'IPv6' {
  return ip.indexOf(':') >= 0 ? 'IPv6' : 'IPv4'
}

function normalizeIp(ip: string): string {
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)
  return mapped ? mapped[1] : ip
}

function isQueryablePublicIp(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === '0.0.0.0') return false
  return !isPrivateIp(ip)
}

function countryFlag(code?: string): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return ''
  const upper = code.toUpperCase()
  return String.fromCodePoint(
    0x1f1e6 + upper.charCodeAt(0) - 65,
    0x1f1e6 + upper.charCodeAt(1) - 65
  )
}

interface IpWhoisResponse {
  success?: boolean
  message?: string
  country?: string
  country_code?: string
  region?: string
  city?: string
  connection?: { isp?: string; org?: string; domain?: string }
  timezone?: { id?: string; utc?: string }
}

interface GeoInfo {
  country: string
  region: string
  city: string
  isp: string
  timezone: string
}

interface DeviceInfo {
  browser: string
  os: string
  deviceType: string
  screen: string
  language: string
  timeZone: string
}

export default function IpPage() {
  const [localIps, setLocalIps] = useState<string[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)

  const [publicIp, setPublicIp] = useState<string | null>(null)
  const [publicLoading, setPublicLoading] = useState(true)
  const [publicError, setPublicError] = useState<string | null>(null)
  const [publicNonce, setPublicNonce] = useState(0)

  const [geo, setGeo] = useState<GeoInfo | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [geoNonce, setGeoNonce] = useState(0)

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [online, setOnline] = useState(true)

  // 本地 IP（WebRTC，纯浏览器端）
  useEffect(() => {
    let active = true
    setLocalLoading(true)
    setLocalError(null)
    getLocalIps()
      .then((ips) => {
        if (!active) return
        if (ips.length > 0) {
          setLocalIps(sortLocalIps(ips))
        } else {
          setLocalError('无法获取本地 IP（浏览器可能限制 WebRTC，或只返回 mDNS 主机名）')
        }
      })
      .catch(() => {
        if (active) setLocalError('获取本地 IP 失败')
      })
      .finally(() => {
        if (active) setLocalLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // 公网 IP（由本站服务器从请求头读取）
  useEffect(() => {
    let active = true
    setPublicLoading(true)
    setPublicError(null)
    fetch('/api/ip', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { ip?: string }) => {
        if (!active) return
        const ip = data && data.ip ? normalizeIp(data.ip) : ''
        if (ip && ip !== 'unknown') {
          setPublicIp(ip)
        } else {
          setPublicIp(null)
          setPublicError('未能从请求头获取公网 IP')
        }
      })
      .catch(() => {
        if (active) {
          setPublicIp(null)
          setPublicError('获取公网 IP 失败')
        }
      })
      .finally(() => {
        if (active) setPublicLoading(false)
      })
    return () => {
      active = false
    }
  }, [publicNonce])

  // 归属地查询（ipwho.is），失败不影响主信息
  useEffect(() => {
    if (!publicIp) {
      setGeo(null)
      setGeoError(null)
      setGeoLoading(false)
      return
    }
    if (!isQueryablePublicIp(publicIp)) {
      setGeo(null)
      setGeoError('该地址为内网或回环地址，无法查询归属地')
      setGeoLoading(false)
      return
    }

    let active = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    setGeoLoading(true)
    setGeoError(null)

    fetch(`https://ipwho.is/${encodeURIComponent(publicIp)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('请求失败')
        return res.json() as Promise<IpWhoisResponse>
      })
      .then((data) => {
        if (!active) return
        if (!data || data.success === false) {
          throw new Error(data && data.message ? data.message : '查询失败')
        }
        setGeo({
          country: `${data.country || ''} ${countryFlag(data.country_code)}`.trim(),
          region: data.region || '',
          city: data.city || '',
          isp: (data.connection && (data.connection.isp || data.connection.org)) || '',
          timezone: (data.timezone && data.timezone.id) || '',
        })
      })
      .catch(() => {
        if (!active) return
        setGeo(null)
        setGeoError('归属地查询暂不可用（网络受限或服务不可用）')
      })
      .finally(() => {
        clearTimeout(timer)
        if (active) setGeoLoading(false)
      })

    return () => {
      active = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [publicIp, geoNonce])

  // 浏览器 / 设备信息（本地解析）
  useEffect(() => {
    const info = parseUserAgent(navigator.userAgent)
    const language =
      navigator.languages && navigator.languages.length > 1
        ? navigator.languages.join(', ')
        : navigator.language
    setDeviceInfo({
      browser: info.browserVersion ? `${info.browser} ${info.browserVersion}` : info.browser,
      os: info.osVersion ? `${info.os} ${info.osVersion}` : info.os,
      deviceType: info.deviceType,
      screen: `${window.screen.width} × ${window.screen.height}${
        window.devicePixelRatio ? `（DPR ${window.devicePixelRatio}）` : ''
      }`,
      language: language || '未知',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || '未知',
    })
    setOnline(navigator.onLine)
    const handleNetwork = () => setOnline(navigator.onLine)
    window.addEventListener('online', handleNetwork)
    window.addEventListener('offline', handleNetwork)
    return () => {
      window.removeEventListener('online', handleNetwork)
      window.removeEventListener('offline', handleNetwork)
    }
  }, [])

  const hasLocalIps = localIps.length > 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ToolHeader
        title="本机 IP 查询"
        description="查看局域网 IP、公网 IP、IP 归属地及浏览器设备信息，主要信息一键复制"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 本地 IP */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                本机 IP（局域网）
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                通过 WebRTC 在浏览器内获取，已去重并按私有地址优先排序
              </p>
              {localLoading ? (
                <div className="flex items-center text-gray-500 text-sm dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                  获取中...
                </div>
              ) : localError ? (
                <div className="text-red-600 text-sm dark:text-red-400">{localError}</div>
              ) : hasLocalIps ? (
                <div className="flex flex-wrap gap-2">
                  {localIps.map((ip) => (
                    <div
                      key={ip}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 dark:border-gray-600 dark:bg-gray-700/40"
                    >
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {isPrivateIp(ip) ? '私有' : '其他'}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {ipVersion(ip)}
                      </span>
                      <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {ip}
                      </code>
                      <CopyButton text={ip} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-sm dark:text-gray-500">未能获取</div>
              )}
            </div>

            {/* 公网 IP */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    公网 IP
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    由本站服务器从请求头读取（/api/ip）
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPublicNonce((value) => value + 1)}
                  disabled={publicLoading}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  刷新
                </button>
              </div>
              <div className="mt-3">
                {publicLoading ? (
                  <div className="flex items-center text-gray-500 text-sm dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                    获取中...
                  </div>
                ) : publicError ? (
                  <div className="text-red-600 text-sm dark:text-red-400">{publicError}</div>
                ) : publicIp ? (
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        {ipVersion(publicIp)}
                      </span>
                      {isPrivateIp(publicIp) && (
                        <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          内网地址
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-2xl font-mono text-blue-600 break-all dark:text-blue-400">
                        {publicIp}
                      </code>
                      <CopyButton text={publicIp} />
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm dark:text-gray-500">未能获取</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 归属地 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    IP 归属地
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    查询公网 IP 的国家、地区、城市、运营商与时区
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGeoNonce((value) => value + 1)}
                  disabled={geoLoading || !publicIp || !isQueryablePublicIp(publicIp)}
                  className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  重新查询
                </button>
              </div>

              {geoLoading ? (
                <div className="mt-3 flex items-center text-gray-500 text-sm dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                  查询中...
                </div>
              ) : geoError ? (
                <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{geoError}</p>
              ) : geo ? (
                <div className="mt-3">
                  <InfoRow label="国家" value={geo.country} />
                  <InfoRow label="地区" value={geo.region} />
                  <InfoRow label="城市" value={geo.city} />
                  <InfoRow label="运营商" value={geo.isp} />
                  <InfoRow label="时区" value={geo.timezone} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  等待获取公网 IP…
                </p>
              )}

              {geo && geoError === null && (
                <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                  数据来源 ipwho.is，仅供参考
                </p>
              )}
            </div>

            {/* 浏览器与设备 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                浏览器与设备
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                根据 navigator.userAgent 本地解析，不请求第三方
              </p>
              {deviceInfo ? (
                <div>
                  <InfoRow label="浏览器" value={deviceInfo.browser} />
                  <InfoRow label="操作系统" value={deviceInfo.os} />
                  <InfoRow label="设备类型" value={deviceInfo.deviceType} />
                  <InfoRow label="屏幕" value={deviceInfo.screen} />
                  <InfoRow label="语言" value={deviceInfo.language} />
                  <InfoRow label="时区" value={deviceInfo.timeZone} />
                  <InfoRow label="网络状态" value={online ? '在线' : '离线'} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">读取中…</p>
              )}
            </div>
          </div>

          {/* 说明 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">说明</h3>
            <p>
              1. <strong>本地 IP</strong> 通过浏览器 WebRTC 接口在本地获取，本站不会上传该地址；部分浏览器只返回 mDNS 主机名或直接限制该能力。
            </p>
            <p>
              2. <strong>公网 IP</strong> 由本站服务器（/api/ip）从访问请求头解析后返回，不需要浏览器访问外部接口。
            </p>
            <p>
              3. <strong>归属地查询</strong>会把公网 IP 发送给第三方服务 ipwho.is；若被网络限制、超时或服务不可用，仅提示「归属地查询暂不可用」，不影响上方 IP 展示。
            </p>
            <p>
              4. <strong>浏览器与设备信息</strong>完全在本地根据 navigator.userAgent、屏幕与语言设置解析。
            </p>
            <p>5. 请勿在公共电脑上泄露 IP 信息；页面关闭后数据即清除。</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
