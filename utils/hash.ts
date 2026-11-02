/**
 * 哈希计算工具函数
 * MD5 使用纯 JS 实现（按 UTF-8 字节计算，中文结果与标准一致）
 * SHA 系列与 HMAC 使用 Web Crypto API
 */

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-512'
export type HmacAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-512'

export const HASH_ALGORITHMS: HashAlgorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

const MD5_K = [
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
  0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
  0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
  0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
  0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
  0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
  0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
  0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
  0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
  0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
  0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
]

const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

function rotateLeft(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits))
}

function wordToHex(value: number): string {
  let hex = ''
  for (let i = 0; i < 4; i++) {
    hex += ((value >>> (i * 8)) & 0xff).toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * 计算 MD5（输入为字节数组）
 */
export function md5Bytes(input: Uint8Array): string {
  const length = input.length
  // 预留 0x80 + 8 字节长度，并按 64 字节对齐
  const paddedLength = ((length + 8) >>> 6 << 6) + 64
  const buffer = new Uint8Array(paddedLength)
  buffer.set(input)
  buffer[length] = 0x80

  const view = new DataView(buffer.buffer)
  const bitLength = length * 8
  view.setUint32(paddedLength - 8, bitLength >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const words = new Uint32Array(16)

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      words[i] = view.getUint32(offset + i * 4, true)
    }

    let a = a0
    let b = b0
    let c = c0
    let d = d0

    for (let i = 0; i < 64; i++) {
      let f: number
      let g: number

      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }

      const temp = d
      d = c
      c = b
      b = (b + rotateLeft((a + f + MD5_K[i] + words[g]) >>> 0, MD5_S[i])) >>> 0
      a = temp
    }

    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }

  return wordToHex(a0) + wordToHex(b0) + wordToHex(c0) + wordToHex(d0)
}

/**
 * 计算文本 MD5（按 UTF-8 编码）
 */
export function md5Text(input: string): string {
  return md5Bytes(new TextEncoder().encode(input))
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 计算哈希；传入 hmacKey 时使用 HMAC
 */
export async function hashBytes(
  data: Uint8Array,
  algorithm: HashAlgorithm,
  hmacKey?: string
): Promise<string> {
  if (hmacKey !== undefined && hmacKey !== '') {
    if (algorithm === 'MD5') {
      throw new Error('Web Crypto 不支持 HMAC-MD5，请选择 SHA 系列算法')
    }
    if (!globalThis.crypto?.subtle) {
      throw new Error('当前环境不支持 Web Crypto，请使用 HTTPS 或 localhost 访问')
    }
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(hmacKey),
      { name: 'HMAC', hash: algorithm },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, data as unknown as BufferSource)
    return toHex(new Uint8Array(signature))
  }

  if (algorithm === 'MD5') {
    return md5Bytes(data)
  }

  if (!globalThis.crypto?.subtle) {
    throw new Error('当前环境不支持 Web Crypto，请使用 HTTPS 或 localhost 访问')
  }

  const digest = await crypto.subtle.digest({ name: algorithm }, data as unknown as BufferSource)
  return toHex(new Uint8Array(digest))
}

/**
 * 读取文件并计算哈希
 */
export async function hashFile(
  file: File,
  algorithm: HashAlgorithm,
  hmacKey?: string
): Promise<string> {
  const buffer = await file.arrayBuffer()
  return hashBytes(new Uint8Array(buffer), algorithm, hmacKey)
}
