'use client'

import { useState, useCallback, useMemo } from 'react'
import Footer from '@/components/shared/Footer'

const features = ['纯JS实现', '实时计算', '大小写切换', '批量计算', '本地处理']

/**
 * 纯 JavaScript MD5 实现
 * 基于 Joseph Myers 的 MD5 算法
 */
function md5(input: string): string {
  function rotateLeft(lValue: number, iShiftBits: number): number {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits))
  }

  function addUnsigned(lX: number, lY: number): number {
    const lX4 = lX & 0x40000000
    const lY4 = lY & 0x40000000
    const lX8 = lX & 0x80000000
    const lY8 = lY & 0x80000000
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff)
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8
      return lResult ^ 0x40000000 ^ lX8 ^ lY8
    }
    return lResult ^ lX8 ^ lY8
  }

  function F(x: number, y: number, z: number): number {
    return (x & y) | (~x & z)
  }
  function G(x: number, y: number, z: number): number {
    return (x & z) | (y & ~z)
  }
  function H(x: number, y: number, z: number): number {
    return x ^ y ^ z
  }
  function I(x: number, y: number, z: number): number {
    return y ^ (x | ~z)
  }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac))
    return addUnsigned(rotateLeft(a, s), b)
  }

  function convertToWordArray(str: string): number[] {
    let lWordCount
    const lMessageLength = str.length
    const lNumberOfWordsTemp1 = lMessageLength + 8
    const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64
    const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16
    const lWordArray: number[] = []
    let lBytePosition = 0
    let lByteCount = 0
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4
      lBytePosition = (lByteCount % 4) * 8
      lWordArray[lWordCount] =
        lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition)
      lByteCount++
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4
    lBytePosition = (lByteCount % 4) * 8
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition)
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29
    return lWordArray
  }

  function wordToHex(lValue: number): string {
    let wordToHexValue = ''
    let wordToHexValueTemp = ''
    let lByte: number
    let lCount: number
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255
      wordToHexValueTemp = '0' + lByte.toString(16)
      wordToHexValue = wordToHexValue + wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2)
    }
    return wordToHexValue
  }

  const x = convertToWordArray(input)
  let a = 0x67452301
  let b = 0xefcdab89
  let c = 0x98badcfe
  let d = 0x10325476

  const S11 = 7, S12 = 12, S13 = 17, S14 = 22
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21

  let k = 0
  let AA: number, BB: number, CC: number, DD: number
  while (k < x.length) {
    AA = a
    BB = b
    CC = c
    DD = d
    a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478)
    d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756)
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070db)
    b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee)
    a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf)
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a)
    c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613)
    b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501)
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8)
    d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af)
    c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1)
    b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be)
    a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122)
    d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193)
    c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e)
    b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821)

    a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562)
    d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340)
    c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51)
    b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa)
    a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d)
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453)
    c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681)
    b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8)
    a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6)
    d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6)
    c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87)
    b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed)
    a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905)
    d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8)
    c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9)
    b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a)

    a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942)
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681)
    c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122)
    b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c)
    a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44)
    d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9)
    c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60)
    b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70)
    a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6)
    d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa)
    c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085)
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881d05)
    a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039)
    d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5)
    c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8)
    b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665)

    a = II(a, b, c, d, x[k + 0], S41, 0xf4292244)
    d = II(d, a, b, c, x[k + 7], S42, 0x432aff97)
    c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7)
    b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039)
    a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3)
    d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92)
    c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d)
    b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1)
    a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f)
    d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0)
    c = II(c, d, a, b, x[k + 6], S43, 0xa3014314)
    b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1)
    a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82)
    d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235)
    c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb)
    b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391)

    a = addUnsigned(a, AA)
    b = addUnsigned(b, BB)
    c = addUnsigned(c, CC)
    d = addUnsigned(d, DD)
    k = k + 16
  }

  return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)
}

/**
 * 复制文本到剪贴板
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function Md5Page() {
  const [input, setInput] = useState('')
  const [upperCase, setUpperCase] = useState(false)
  const [copied, setCopied] = useState(false)

  // 计算 MD5（支持批量：每行一个）
  const results = useMemo(() => {
    if (!input) return []
    const lines = input.split('\n')
    return lines.map((line) => {
      const hash = md5(line)
      return {
        text: line,
        hash: upperCase ? hash.toUpperCase() : hash,
      }
    })
  }, [input, upperCase])

  const handleCopy = useCallback(async (text: string) => {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }, [])

  const handleCopyAll = useCallback(async () => {
    const all = results.map((r) => r.hash).join('\n')
    await copyToClipboard(all)
  }, [results])

  const inputLength = input.length
  const inputLines = input ? input.split('\n').length : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white shadow-sm border-b">
        <div className="container-responsive py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              MD5 计算
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              输入文本，实时生成 MD5 哈希值
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
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 输入区 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">输入文本</h2>
              <label className="inline-flex items-center text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={upperCase}
                  onChange={(e) => setUpperCase(e.target.checked)}
                  className="mr-2 accent-blue-600"
                />
                大写输出
              </label>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入要计算 MD5 的文本，支持多行批量计算（每行一个）"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-y"
            />
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{inputLength} 字符 · {inputLines} 行</span>
              <button
                onClick={() => setInput('')}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                清空
              </button>
            </div>
          </div>

          {/* 结果区 */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                MD5 结果
              </h2>
              {results.length > 0 && (
                <button
                  onClick={handleCopyAll}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  复制全部
                </button>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>请在上方输入文本</p>
              </div>
            ) : results.length === 1 ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3">
                  <code className="flex-1 text-lg font-mono text-blue-600 break-all">
                    {results[0].hash}
                  </code>
                  <button
                    onClick={() => handleCopy(results[0].hash)}
                    className="shrink-0 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 rounded-lg p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate mb-1">
                        {r.text || '(空行)'}
                      </p>
                      <code className="text-sm font-mono text-blue-600 break-all">
                        {r.hash}
                      </code>
                    </div>
                    <button
                      onClick={() => handleCopy(r.hash)}
                      className="shrink-0 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      复制
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 使用说明 */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">说明</h3>
            <div className="text-blue-800 text-sm space-y-2">
              <p>1. <strong>MD5</strong> 是一种广泛使用的哈希函数，将任意长度的输入映射为 128 位（16 字节）的哈希值，通常表示为 32 位十六进制字符串。</p>
              <p>2. 本工具使用纯 JavaScript 实现，所有计算在浏览器本地完成，文本不会上传到服务器。</p>
              <p>3. 支持<strong>多行批量计算</strong>：每行输入一段文本，将分别生成对应的 MD5 值。</p>
              <p>4. 注意：MD5 已不适合用于安全加密场景，建议仅用于校验、去重等非安全用途。</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
