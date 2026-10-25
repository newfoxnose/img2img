'use client'

import { useState, useEffect, useCallback } from 'react'
import Footer from '@/components/shared/Footer'

const features = ['本地IP', '公网IP', '一键复制', '纯本地获取', '完全免费']

/**
 * 复制文本到剪贴板
 */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 通过 WebRTC 获取本机局域网 IP
 */
function getLocalIps(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips = new Set<string>()
    const RTCPeerConnection =
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection

    if (!RTCPeerConnection) {
      resolve([])
      return
    }

    const pc = new RTCPeerConnection({ iceServers: [] })
    pc.createDataChannel('')

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        resolve(Array.from(ips))
        return
      }
      const candidate = event.candidate.candidate
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/
      const match = candidate.match(ipRegex)
      if (match) {
        const ip = match[1]
        // 过滤掉 0.0.0.0 和无效 IP
        if (ip !== '0.0.0.0' && !ip.startsWith('255.')) {
          ips.add(ip)
        }
      }
    }

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => resolve(Array.from(ips)))

    // 超时兜底
    setTimeout(() => resolve(Array.from(ips)), 2000)
  })
}

/**
 * IP 信息展示卡片
 */
function IpCard({
  title,
  ip,
  loading,
  error,
  hint,
}: {
  title: string
  ip: string | null
  loading: boolean
  error: string | null
  hint: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!ip) return
    const ok = await copyToClipboard(ip)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [ip])

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">{title}</h2>
      <p className="text-xs text-gray-500 mb-4">{hint}</p>

      {loading ? (
        <div className="flex items-center text-gray-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
          获取中...
        </div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : ip ? (
        <div className="flex items-center justify-between gap-3">
          <code className="text-2xl font-mono text-blue-600 break-all">
            {ip}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">未能获取</div>
      )}
    </div>
  )
}

export default function IpPage() {
  const [localIp, setLocalIp] = useState<string | null>(null)
  const [publicIp, setPublicIp] = useState<string | null>(null)
  const [localLoading, setLocalLoading] = useState(true)
  const [publicLoading, setPublicLoading] = useState(true)
  const [localError, setLocalError] = useState<string | null>(null)
  const [publicError, setPublicError] = useState<string | null>(null)

  // 获取本地 IP
  useEffect(() => {
    let active = true
    getLocalIps()
      .then((ips) => {
        if (!active) return
        if (ips.length > 0) {
          // 优先显示 IPv4 局域网地址
          const privateIp =
            ips.find(
              (ip) =>
                ip.startsWith('192.168.') ||
                ip.startsWith('10.') ||
                ip.startsWith('172.')
            ) || ips[0]
          setLocalIp(privateIp)
        } else {
          setLocalError('无法获取本地IP（浏览器可能限制了 WebRTC）')
        }
      })
      .catch(() => {
        if (active) setLocalError('获取本地IP失败')
      })
      .finally(() => {
        if (active) setLocalLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // 获取公网 IP（从服务器请求头中读取，无需外部 API）
  useEffect(() => {
    let active = true
    fetch('/api/ip')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ip && data.ip !== 'unknown') {
          setPublicIp(data.ip)
        } else if (active) {
          setPublicError('未能从请求头获取公网IP')
        }
      })
      .catch(() => {
        if (active) setPublicError('获取公网IP失败')
      })
      .finally(() => {
        if (active) setPublicLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="container-responsive py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              本机 IP 查询
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              快速查看您的局域网 IP 和公网 IP 地址
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="px-3 py-1 bg-gray-100 rounded-full"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="container-responsive py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <IpCard
            title="本机 IP（局域网）"
            ip={localIp}
            loading={localLoading}
            error={localError}
            hint="通过 WebRTC 获取，无需联网"
          />
          <IpCard
            title="公网 IP"
            ip={publicIp}
            loading={publicLoading}
            error={publicError}
            hint="从服务器请求头中获取，即您对外访问的网络地址"
          />
        </div>

        {/* 使用说明 */}
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              说明
            </h3>
            <div className="text-blue-800 text-sm space-y-2">
              <p>1. <strong>本机 IP</strong>：设备在局域网内的地址，通常由路由器分配（如 192.168.x.x）。</p>
              <p>2. <strong>公网 IP</strong>：设备在互联网上的地址，由运营商分配，从访问请求头中直接读取。</p>
              <p>3. 本地 IP 通过浏览器 WebRTC 接口获取，不会上传任何数据；公网 IP 由服务器从请求头解析。</p>
              <p>4. 若本地 IP 无法获取，可能是浏览器禁用了 WebRTC 或使用了隐私模式。</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
