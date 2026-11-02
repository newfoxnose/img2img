'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import ToolHeader from '@/components/shared/ToolHeader'
import CameraUploadButton from '@/components/shared/CameraUploadButton'
import { decodeQrFromImage } from '@/lib/qr-decode'

const features = ['生成二维码', 'PNG/SVG 下载', '图片识别', '美化二维码识别', '本地处理']

type ErrorLevel = 'L' | 'M' | 'Q' | 'H'

const ERROR_LEVELS: { value: ErrorLevel; label: string }[] = [
  { value: 'L', label: 'L · 低' },
  { value: 'M', label: 'M · 中' },
  { value: 'Q', label: 'Q · 较高' },
  { value: 'H', label: 'H · 高' },
]

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i

function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard) return Promise.resolve(false)
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (await copyText(text)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 px-2.5 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
    >
      {copied ? '已复制' : '复制'}
    </button>
  )
}

export default function QrcodePage() {
  // 生成
  const [text, setText] = useState('https://example.com')
  const [size, setSize] = useState(320)
  const [level, setLevel] = useState<ErrorLevel>('M')
  const [darkColor, setDarkColor] = useState('#000000')
  const [lightColor, setLightColor] = useState('#ffffff')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [qrError, setQrError] = useState('')

  // 识别
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [decodeResult, setDecodeResult] = useState('')
  const [decodeError, setDecodeError] = useState('')
  const [decodeMethod, setDecodeMethod] = useState('')
  const [decoding, setDecoding] = useState(false)
  const [dragging, setDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const decodeSeqRef = useRef(0)

  const trimmedText = text.trim()

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  // 输入或选项变化时重新生成
  useEffect(() => {
    let canceled = false

    if (!trimmedText) {
      setQrDataUrl('')
      setQrError('')
      setQrLoading(false)
      return
    }

    setQrLoading(true)
    const timer = window.setTimeout(() => {
      QRCode.toDataURL(text, {
        width: size,
        margin: 2,
        errorCorrectionLevel: level,
        color: { dark: darkColor, light: lightColor },
      })
        .then((url) => {
          if (!canceled) {
            setQrDataUrl(url)
            setQrError('')
          }
        })
        .catch((err: unknown) => {
          if (!canceled) {
            setQrDataUrl('')
            setQrError(
              err instanceof Error ? err.message : '生成失败，请检查输入内容是否过长'
            )
          }
        })
        .finally(() => {
          if (!canceled) setQrLoading(false)
        })
    }, 250)

    return () => {
      canceled = true
      window.clearTimeout(timer)
    }
  }, [text, trimmedText, size, level, darkColor, lightColor])

  const handleDownloadPng = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = 'qrcode.png'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const handleDownloadSvg = async () => {
    if (!trimmedText) return
    try {
      const svg = await QRCode.toString(text, {
        type: 'svg',
        margin: 2,
        errorCorrectionLevel: level,
        color: { dark: darkColor, light: lightColor },
      })
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'qrcode.svg'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setQrError('')
    } catch (err) {
      setQrError(err instanceof Error ? err.message : 'SVG 生成失败，请检查输入内容')
    }
  }

  const decodeImage = (url: string) => {
    const seq = decodeSeqRef.current + 1
    decodeSeqRef.current = seq
    setDecoding(true)
    setDecodeMethod('')

    const image = new Image()
    image.onload = async () => {
      if (decodeSeqRef.current !== seq) return
      try {
        const outcome = await decodeQrFromImage(image)
        if (decodeSeqRef.current !== seq) return

        if (outcome.data) {
          setDecodeResult(outcome.data)
          setDecodeMethod(outcome.method)
          setDecodeError('')
        } else {
          setDecodeResult('')
          setDecodeError(
            '未识别到二维码。美化二维码若遮挡面积过大（如大面积 Logo、文字横幅）可能超出纠错范围，可尝试截取二维码主体、提高图片清晰度或换用标准样式后重试'
          )
        }
      } catch (err) {
        if (decodeSeqRef.current !== seq) return
        setDecodeResult('')
        setDecodeError(
          err instanceof Error ? err.message : '识别失败，请换一张清晰的图片'
        )
      } finally {
        if (decodeSeqRef.current === seq) setDecoding(false)
      }
    }
    image.onerror = () => {
      if (decodeSeqRef.current !== seq) return
      setDecodeResult('')
      setDecodeError('图片加载失败，请更换图片后重试')
      setDecoding(false)
    }
    image.src = url
  }

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/') && !IMAGE_EXTENSION_RE.test(file.name)) {
      setDecodeResult('')
      setDecodeError('请选择图片文件（PNG / JPG / WEBP 等）')
      return
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setPreviewUrl(url)
    setFileName(file.name)
    setDecodeResult('')
    setDecodeError('')
    setDecodeMethod('')
    decodeImage(url)
  }

  const resetImage = () => {
    decodeSeqRef.current += 1
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl('')
    setFileName('')
    setDecodeResult('')
    setDecodeError('')
    setDecodeMethod('')
    setDecoding(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      <ToolHeader
        title="二维码工具"
        description="在线生成二维码并下载 PNG/SVG，也可以上传图片识别二维码内容，全部在浏览器本地处理"
        features={features}
      />

      <main className="container-responsive pb-12">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* 生成二维码 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">生成二维码</h2>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="qr-text"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      文本或网址
                    </label>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {text.length} 字符
                    </span>
                  </div>
                  <textarea
                    id="qr-text"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder="输入要生成二维码的文本或网址"
                    spellCheck={false}
                    className="w-full h-28 p-3 rounded-lg border border-gray-300 bg-white font-mono text-sm resize-y focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="qr-size"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      尺寸
                    </label>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {size} × {size} px
                    </span>
                  </div>
                  <input
                    id="qr-size"
                    type="range"
                    min={128}
                    max={1024}
                    step={32}
                    value={size}
                    onChange={(event) => setSize(Number(event.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    容错级别
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ERROR_LEVELS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setLevel(item.value)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          level === item.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="qr-dark"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      前景色
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id="qr-dark"
                        type="color"
                        value={darkColor}
                        onChange={(event) => setDarkColor(event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {darkColor}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="qr-light"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      背景色
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id="qr-light"
                        type="color"
                        value={lightColor}
                        onChange={(event) => setLightColor(event.target.value)}
                        className="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5 dark:border-gray-600 dark:bg-gray-700"
                      />
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {lightColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex min-h-[248px] flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-900/40">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="生成的二维码"
                      className="h-auto w-full max-w-[260px] rounded"
                    />
                  ) : (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                      <div className="text-3xl mb-2">🔳</div>
                      {qrLoading ? '生成中...' : '输入内容后自动生成二维码'}
                    </div>
                  )}
                </div>

                {qrError && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">{qrError}</p>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    disabled={!qrDataUrl}
                    className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    下载 PNG
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    disabled={!trimmedText}
                    className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    下载 SVG
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 识别二维码 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">识别二维码</h2>

            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                const file = event.dataTransfer.files?.[0]
                if (file) handleImageFile(file)
              }}
              className={`mt-4 rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragging
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 dark:border-gray-600 dark:bg-gray-700/40'
              }`}
            >
              <div className="text-3xl mb-2">🖼️</div>
              <p className="font-medium text-gray-700 dark:text-gray-200">
                点击选择或拖拽二维码图片到这里
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                支持 PNG / JPG / WEBP，彩色、圆点、渐变、带 Logo 等美化样式会自动增强识别
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) handleImageFile(file)
              }}
            />
            <div className="mt-3 flex justify-center">
              <CameraUploadButton
                onSelect={(files) => {
                  const file = files?.[0]
                  if (file) handleImageFile(file)
                }}
                label="拍照识别二维码"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-600 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
              />
            </div>

            {(previewUrl || fileName || decodeError) && (
              <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={`二维码图片预览：${fileName}`}
                        className="max-h-56 w-full rounded-lg border border-gray-200 bg-white object-contain dark:border-gray-600"
                      />
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm text-gray-600 dark:text-gray-300">
                        {fileName || '未选择图片'}
                      </p>
                      <button
                        type="button"
                        onClick={resetImage}
                        className="shrink-0 px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      >
                        移除
                      </button>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      识别结果
                    </p>
                    {decoding ? (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        识别中，正在尝试多种增强方式...
                      </p>
                    ) : decodeResult ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-start gap-2">
                          <code className="max-h-40 flex-1 overflow-auto whitespace-pre-wrap break-all font-mono text-sm text-gray-800 dark:text-gray-100">
                            {decodeResult}
                          </code>
                          <CopyButton text={decodeResult} />
                        </div>
                        {decodeMethod && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            识别方式：{decodeMethod}
                          </p>
                        )}
                      </div>
                    ) : decodeError ? (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{decodeError}</p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        上传图片后将自动识别
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p>1. 二维码生成与识别全部在浏览器本地完成，文本和图片不会上传到服务器。</p>
            <p>2. 容错级别越高，二维码越密但越容易被遮挡后识别，日常分享推荐 M 级。</p>
            <p>3. 识别大图时会自动缩放到最大边 1600px，并依次尝试对比度增强、全局/自适应二值化与 ZXing 深度识别，以提升美化二维码的成功率。</p>
            <p>4. 若二维码中心被大面积 Logo 或文字遮挡，超出其纠错能力时仍可能识别失败，建议截取二维码主体或使用更高容错级别重新生成。</p>
          </div>
        </div>
      </main>
    </div>
  )
}
