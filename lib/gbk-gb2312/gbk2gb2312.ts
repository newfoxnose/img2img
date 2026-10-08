/**
 * GBK到GB2312转换工具
 * 将GBK编码中不在GB2312字符集内的字符替换为GB2312中相似的字符
 */

import { pinyin } from 'pinyin-pro'
import pinyinLib from 'pinyin'
import * as OpenCC from 'opencc-js'
import { GB2312_CHAR_LIST, GB2312_CHAR_SET } from './data/gb2312Chars'
import { PINYIN_FALLBACK_MAP } from './data/pinyinFallbackMap'
import { PINYIN_TO_GB2312_MAP } from './data/pinyinToGb2312Map'

const GB2312_SET: Set<string> = GB2312_CHAR_SET as Set<string>

const PRONUNCIATION_CACHE = new Map<string, string | null>()
const PINYIN_OPTIONS = {
  toneType: 'none',
  multiple: false,
  pattern: 'pinyin',
} as const
const PINYIN_JS_OPTIONS: Parameters<typeof pinyinLib>[1] = {
  style: pinyinLib.STYLE_NORMAL,
  heteronym: false,
  segment: false,
}

const TRADITIONAL_TO_SIMPLIFIED = OpenCC.Converter({ from: 'tw', to: 'cn' })

const UNICODE_VARIANT_MAP: Record<string, string> = {
  '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
  '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
  'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
  'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
  'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O',
  'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
  'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y',
  'Ｚ': 'Z',
  'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e',
  'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
  'ｋ': 'k', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o',
  'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
  'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y',
  'ｚ': 'z',
  '！': '!', '．': '.', '，': ',', '；': ';', '：': ':',
  '？': '?', '（': '(', '）': ')', '［': '[', '］': ']',
  '＋': '+', '＝': '=', '／': '/', '％': '%',
  '＆': '&', '｜': '|', '～': '~',
}

function normalizeUnicodeVariant(char: string): string {
  return UNICODE_VARIANT_MAP[char] || char
}

function normalizeUnicode(text: string): string {
  return text.normalize('NFC')
}

function isHighSurrogate(char: string): boolean {
  const code = char.charCodeAt(0)
  return code >= 0xD800 && code <= 0xDBFF
}

function isLowSurrogate(char: string): boolean {
  const code = char.charCodeAt(0)
  return code >= 0xDC00 && code <= 0xDFFF
}

function getSurrogatePairChar(high: string, low: string): string {
  const highCode = high.charCodeAt(0)
  const lowCode = low.charCodeAt(0)
  const codePoint = 0x10000 + ((highCode - 0xD800) * 0x400) + (lowCode - 0xDC00)
  return String.fromCodePoint(codePoint)
}

function isGBKChar(char: string): boolean {
  // 处理代理对字符 - GBK不支持代理对字符（扩展B及以上），所以直接返回false
  if (char.length === 2 && isHighSurrogate(char[0]) && isLowSurrogate(char[1])) {
    return false
  }

  const checkCode = char.charCodeAt(0)

  // GBK字符范围判断 - GBK实际只支持基本汉字和扩展A，不支持扩展B及以上
  if (
    // 基本汉字
    (checkCode >= 0x4E00 && checkCode <= 0x9FA5) ||
    // 扩展A（GBK支持）
    (checkCode >= 0x3400 && checkCode <= 0x4DB5) ||
    // 全角ASCII、希腊字母、俄文字母
    (checkCode >= 0xFF00 && checkCode <= 0xFFEF) ||
    // 中文标点符号
    (checkCode >= 0x3000 && checkCode <= 0x303F) ||
    // 日文假名
    (checkCode >= 0x3040 && checkCode <= 0x309F) ||
    (checkCode >= 0x30A0 && checkCode <= 0x30FF) ||
    // 韩文字母
    (checkCode >= 0xAC00 && checkCode <= 0xD7AF)
  ) {
    return true
  }

  return false
}

function isGB2312Char(char: string): boolean {
  if (char.length === 2 && isHighSurrogate(char[0]) && isLowSurrogate(char[1])) {
    const fullChar = getSurrogatePairChar(char[0], char[1])
    return GB2312_SET.has(fullChar)
  }

  const charCode = char.charCodeAt(0)

  if (charCode >= 0x9FA0 && charCode <= 0x9FFF) {
    return false
  }

  return GB2312_SET.has(char)
}

/**
 * 将输入文本统一转换为简体，便于后续基于GB2312字符集做处理
 */
function convertTraditionalToSimplified(text: string): string {
  try {
    return TRADITIONAL_TO_SIMPLIFIED(text)
  } catch {
    return text
  }
}

function normalizePlainPinyin(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  const normalized = value.toLowerCase().replace(/ü/g, 'v').replace(/[^a-z]/g, '')
  return normalized || null
}

function getCharPronunciation(char: string): string | null {
  if (PRONUNCIATION_CACHE.has(char)) {
    return PRONUNCIATION_CACHE.get(char) ?? null
  }

  // 处理代理对字符
  let targetChar = char
  let isProxyPair = false
  if (char.length === 2 && isHighSurrogate(char[0]) && isLowSurrogate(char[1])) {
    targetChar = getSurrogatePairChar(char[0], char[1])
    isProxyPair = true
  }

  let pronunciation: string | null = null

  try {
    const result = pinyin(targetChar, PINYIN_OPTIONS)
    const normalizedCandidate = Array.isArray(result)
      ? result[0]
      : (result || '').split(' ')[0]
    const normalized = normalizedCandidate ?? ''
    pronunciation = normalizePlainPinyin(normalized)
  } catch {
    pronunciation = null
  }

  if (!pronunciation) {
    const fallback = PINYIN_FALLBACK_MAP[targetChar as keyof typeof PINYIN_FALLBACK_MAP]
    pronunciation = fallback ?? null
  }

  if (!pronunciation) {
    pronunciation = getPronunciationFromPinyinLib(targetChar)
  }

  PRONUNCIATION_CACHE.set(char, pronunciation ?? null)
  return pronunciation
}

function getPronunciationFromPinyinLib(char: string): string | null {
  try {
    const result = pinyinLib(char, PINYIN_JS_OPTIONS)
    if (
      Array.isArray(result) &&
      result.length > 0 &&
      Array.isArray(result[0]) &&
      result[0].length > 0
    ) {
      return normalizePlainPinyin(result[0][0])
    }
  } catch {
    return null
  }
  return null
}

function getHomophonicGB2312Chars(pronunciation: string): string[] {
  return PINYIN_TO_GB2312_MAP[pronunciation] || []
}

function selectBestReplacement(
  originalChar: string,
  candidates: string[]
): string | null {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const originalCode = originalChar.normalize('NFC').charCodeAt(0)

  let bestCandidate = candidates[0]
  let minDistance = Infinity

  for (const candidate of candidates) {
    if (!candidate || candidate.trim() === '') continue

    const candidateCode = candidate.charCodeAt(0)
    const distance = Math.abs(originalCode - candidateCode)

    if (distance < minDistance) {
      minDistance = distance
      bestCandidate = candidate
    }
  }

  return bestCandidate
}

const RADICAL_STROKE_CACHE = new Map<string, { radical: string; strokes: number }>()

function getRadicalAndStrokes(char: string): { radical: string; strokes: number } | null {
  if (RADICAL_STROKE_CACHE.has(char)) {
    return RADICAL_STROKE_CACHE.get(char)!
  }

  // 处理代理对字符
  let targetChar = char
  if (char.length === 2 && isHighSurrogate(char[0]) && isLowSurrogate(char[1])) {
    targetChar = getSurrogatePairChar(char[0], char[1])
  }

  try {
    const result = pinyin(targetChar, { ...PINYIN_OPTIONS, type: 'array' }) as string[]
    if (Array.isArray(result) && result.length > 0) {
      const pinyinStr = result.join('')
      const radicalMatch = pinyinStr.match(/\{([^}]+)\}/)
      if (radicalMatch) {
        const radical = radicalMatch[1]
        const fullPinyin = result.join('')
        const strokeMatch = fullPinyin.match(/\*(\d+)/)
        const strokes = strokeMatch ? parseInt(strokeMatch[1], 10) : 0
        const data = { radical, strokes }
        RADICAL_STROKE_CACHE.set(char, data)
        return data
      }
    }
  } catch {
  }

  const fallbackData = { radical: '', strokes: 0 }
  RADICAL_STROKE_CACHE.set(char, fallbackData)
  return fallbackData
}

function getVisualSimilarGB2312Chars(targetChar: string): string[] {
  const candidates: Array<{ char: string; score: number }> = []

  let targetNormalized = targetChar
  let targetRadical = getRadicalAndStrokes(targetChar) || { radical: '', strokes: 0 }
  let targetCode = targetChar.normalize('NFC').charCodeAt(0)

  if (targetChar.length === 2 && isHighSurrogate(targetChar[0]) && isLowSurrogate(targetChar[1])) {
    const fullChar = getSurrogatePairChar(targetChar[0], targetChar[1])
    targetNormalized = fullChar
    targetRadical = getRadicalAndStrokes(fullChar) || { radical: '', strokes: 0 }
    targetCode = fullChar.charCodeAt(0)
  }

  for (const gbChar of GB2312_CHAR_LIST) {
    if (!gbChar || gbChar.length !== 1) continue

    const gbCode = gbChar.charCodeAt(0)
    if (gbCode >= 0x9FA0 && gbCode <= 0x9FFF) continue

    let score = 0

    const gbRadical = getRadicalAndStrokes(gbChar) || { radical: '', strokes: 0 }
    if (targetRadical.radical && gbRadical.radical === targetRadical.radical) {
      score += 100
      if (targetRadical.strokes > 0 && gbRadical.strokes > 0) {
        const strokeDiff = Math.abs(targetRadical.strokes - gbRadical.strokes)
        score -= strokeDiff * 5
      }
    }

    const codeDistance = Math.abs(targetCode - gbCode)
    score -= Math.min(codeDistance / 100, 20)

    if (targetRadical.radical && gbRadical.radical) {
      const radicalCodeDist = Math.abs(
        targetRadical.radical.charCodeAt(0) - gbRadical.radical.charCodeAt(0)
      )
      score -= radicalCodeDist * 0.5
    }

    candidates.push({ char: gbChar, score })
  }

  candidates.sort((a, b) => b.score - a.score)

  return candidates.slice(0, 20).map(c => c.char)
}

function selectVisualBestReplacement(
  originalChar: string,
  candidates: string[]
): string | null {
  if (candidates.length === 0) return null

  // 获取原始字符的代码点，优先处理代理对
  let originalCode: number
  if (originalChar.length === 2 && isHighSurrogate(originalChar[0]) && isLowSurrogate(originalChar[1])) {
    const fullChar = getSurrogatePairChar(originalChar[0], originalChar[1])
    originalCode = fullChar.charCodeAt(0)
  } else {
    originalCode = originalChar.normalize('NFC').charCodeAt(0)
  }

  let bestCandidate: string | null = null
  let minDistance = Infinity

  for (const candidate of candidates) {
    if (!candidate || candidate.trim() === '') continue

    const candidateCode = candidate.charCodeAt(0)
    if (candidateCode < 0x4E00 || candidateCode > 0x9FFF) continue

    const distance = Math.abs(originalCode - candidateCode)

    if (distance < minDistance) {
      minDistance = distance
      bestCandidate = candidate
    }
  }

  return bestCandidate
}

function normalizeChar(char: string): string {
  const nfc = char.normalize('NFC')
  return UNICODE_VARIANT_MAP[nfc] || nfc
}

export function convertGBKToGB2312(text: string): {
  result: string
  replacedChars: Array<{ original: string; replacement: string; position: number }>
} {
  const replacedChars: Array<{ original: string; replacement: string; position: number }> = []
  const result: string[] = []

  let simplifiedText = convertTraditionalToSimplified(text)
  simplifiedText = normalizeUnicode(simplifiedText)

  let i = 0
  while (i < simplifiedText.length) {
    let char = simplifiedText[i]
    let charIndex = i

    if (char.length === 1 && isHighSurrogate(char) && i + 1 < simplifiedText.length) {
      const nextChar = simplifiedText[i + 1]
      if (isLowSurrogate(nextChar)) {
        char = char + nextChar
        charIndex = i
        i += 2
      } else {
        i++
      }
    } else {
      i++
    }

    const charCode = char.charCodeAt(0)
    let fullCode = charCode
    let isSurrogatePair = false
    if (char.length === 2 && isHighSurrogate(char[0]) && isLowSurrogate(char[1])) {
      const fullChar = getSurrogatePairChar(char[0], char[1])
      fullCode = fullChar.charCodeAt(0)
      isSurrogatePair = true
    }

    const isEmojiOrSymbol = (fullCode >= 0x1F000 && fullCode <= 0x1FAFF) ||
                            (fullCode >= 0x2600 && fullCode <= 0x26FF) ||
                            (fullCode >= 0x2700 && fullCode <= 0x27BF)

    if (isEmojiOrSymbol) {
      result.push(char)
      continue
    }

    const normalizedChar = normalizeChar(char)
    let normalizedCode = normalizedChar.charCodeAt(0)
    const checkCode = isSurrogatePair ? fullCode : normalizedCode

    if (isGB2312Char(normalizedChar)) {
      result.push(normalizedChar)
      continue
    }

    // 检查字符是否在GBK中，如果不在GBK中，直接输出原样
    if (!isGBKChar(char)) {
      result.push(char)
      continue
    }

    const isChineseChar = (checkCode >= 0x4E00 && checkCode <= 0x9FFF) ||
                          (checkCode >= 0x3400 && checkCode <= 0x4DBF) ||
                          (checkCode >= 0x20000 && checkCode <= 0x2A6DF) ||
                          (checkCode >= 0x2A700 && checkCode <= 0x2B73F) ||
                          (checkCode >= 0x2B740 && checkCode <= 0x2B81F) ||
                          (checkCode >= 0x2B820 && checkCode <= 0x2CEAF) ||
                          (checkCode >= 0x2CEB0 && checkCode <= 0x2EBEF) ||
                          (checkCode >= 0x30000 && checkCode <= 0x3134F)

    if (!isChineseChar) {
      result.push(char)
      continue
    }

    const pronunciation = getCharPronunciation(normalizedChar) ?? 'unknown'
    const homophonicChars = getHomophonicGB2312Chars(pronunciation)
    let replacement = selectBestReplacement(normalizedChar, homophonicChars)

    if (!replacement) {
      const visualSimilarChars = getVisualSimilarGB2312Chars(normalizedChar)
      replacement = selectVisualBestReplacement(normalizedChar, visualSimilarChars)
    }

    if (replacement) {
      replacedChars.push({
        original: char,
        replacement: replacement,
        position: charIndex
      })
      result.push(replacement)
    } else {
      // 如果没有找到替换字符，原样输出
      replacedChars.push({
        original: char,
        replacement: char,
        position: charIndex
      })
      result.push(char)
    }
  }

  return {
    result: result.join(''),
    replacedChars
  }
}

/**
 * 批量转换文本
 */
export function batchConvertGBKToGB2312(texts: string[]): string[] {
  return texts.map(text => convertGBKToGB2312(text).result)
}

