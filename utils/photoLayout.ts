/**
 * 通用照片排版算法 —— 将若干照片排到指定相纸上
 *
 * 设计要点：
 * 1. 全部先换算到 mm 统一域，再按 DPI 转像素，避免预览/打印比例漂移
 * 2. 照片不留页边距，照片之间留间隙（默认 2mm）
 * 3. 每张照片同时评估 (w,h) 和 (h,w) 两种方向，取可容纳数量更多的方向
 * 4. 多行布局用 row_height = max(h) 统一结算，避免逐行累加导致的空间浪费
 */

export const DPI = 300

/** 毫米 → 像素 */
export function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * DPI)
}

/** 像素 → 毫米 */
export function pxToMm(px: number): number {
  return (px * 25.4) / DPI
}

/** 预设纸张尺寸（mm） */
export const PAPER_SIZES = {
  '5inch': { name: '5寸相纸', widthMm: 102, heightMm: 152 },
  '6inch': { name: '6寸相纸', widthMm: 152, heightMm: 102 },
} as const

export type PaperSize = keyof typeof PAPER_SIZES

export interface LayoutItem {
  /** 原始上传图片 id（同一张照片的多份副本共享此 id） */
  photoId: string
  /** 实例 id，同一 photoId 的不同副本各自唯一（用于拖动定位） */
  instanceId: string
  x: number // mm，左上角
  y: number // mm
  widthMm: number
  heightMm: number
  /** 该位置是否旋转了 90°（交换了宽高） */
  rotated: boolean
}

export interface LayoutResult {
  paper: PaperSize
  gapMm: number
  items: LayoutItem[]
  paperWidthPx: number
  paperHeightPx: number
}

/** 计算在指定纸张/间隙下能容纳的最大行列数（指定方向） */
function countFit(
  paperW: number,
  paperH: number,
  itemW: number,
  itemH: number,
  gap: number
): { cols: number; rows: number; count: number } {
  const cols = Math.floor((paperW + gap) / (itemW + gap))
  const rows = Math.floor((paperH + gap) / (itemH + gap))
  return { cols, rows, count: cols * rows }
}

export interface PhotoInput {
  photoId: string
  /** 实例 id 前缀，同一张照片展开多份时各自唯一（调用方保证唯一） */
  instanceId: string
  /** 物理宽度 mm */
  widthMm: number
  /** 物理高度 mm */
  heightMm: number
  /** 仅当整张纸只有这一张照片且被标记 autoFill=true 时，铺满整版 */
  autoFill?: boolean
}

/**
 * 行级贪心排版：按给定照片顺序逐张放置
 * 每张照片同时评估 (w,h) 与 (h,w) 两种方向，选可容纳更多的方向
 */
export function layoutPhotos(
  paperSize: PaperSize,
  photos: PhotoInput[],
  opts: { gapMm?: number; allowRotate?: boolean } = {}
): LayoutResult {
  const gapMm = opts.gapMm ?? 2
  const allowRotate = opts.allowRotate ?? true

  const paper = PAPER_SIZES[paperSize]
  const paperW = paper.widthMm
  const paperH = paper.heightMm

  const items: LayoutItem[] = []

  // === 自动铺满 ===
  // 条件：只有一张照片且 autoFill=true（通常是用户只上传了一张且 count=1）
  // 设计意图：给单张人像的"一键铺满"体验；如果用户显式改了 count 就走下面的贪心布局
  if (photos.length === 1 && photos[0].autoFill) {
    const p = photos[0]
    const a = countFit(paperW, paperH, p.widthMm, p.heightMm, gapMm)
    const b = countFit(paperW, paperH, p.heightMm, p.widthMm, gapMm)
    const best = a.count >= b.count ? a : b
    const rotated = a.count < b.count
    const W = rotated ? p.heightMm : p.widthMm
    const H = rotated ? p.widthMm : p.heightMm
    const cols = Math.floor((paperW + gapMm) / (W + gapMm))
    const rows = Math.floor((paperH + gapMm) / (H + gapMm))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        items.push({
          photoId: p.photoId,
          instanceId: p.instanceId,
          x: c * (W + gapMm),
          y: r * (H + gapMm),
          widthMm: W,
          heightMm: H,
          rotated,
        })
      }
    }
  } else {
    // 多张（或 autoFill=false）：贪心行布局
    let x = 0
    let y = 0
    let rowHeight = 0
    for (const p of photos) {
      const W = p.widthMm
      const H = p.heightMm
      const rotW = H
      const rotH = W
      const remW = paperW - x
      const normFits = remW >= W
      const rotFits = allowRotate && remW >= rotW

      let useRotated = false
      let itemW = W
      let itemH = H

      if (!normFits && rotFits) {
        useRotated = true
        itemW = rotW
        itemH = rotH
      } else if (normFits && rotFits) {
        // 都能放下：选剩余宽度更整齐的方向
        const useNormScore = remW - W
        const useRotScore = remW - rotW
        if (useRotScore > 0 && useRotScore < useNormScore) {
          useRotated = true
          itemW = rotW
          itemH = rotH
        }
      } else if (!normFits && !rotFits) {
        // 放不下当前行，换行试试
        y += rowHeight + (items.length > 0 ? gapMm : 0)
        rowHeight = 0
        x = 0
        if (y + H > paperH && !(allowRotate && y + rotH <= paperH)) {
          // 两种方向都放不下新行，跳过
          continue
        }
        const remW2 = paperW - x
        if (allowRotate && remW2 >= rotW && y + rotH <= paperH && remW2 < W) {
          useRotated = true
          itemW = rotW
          itemH = rotH
        } else {
          itemW = W
          itemH = H
        }
        if (x + itemW > paperW || y + itemH > paperH) continue
      }

      if (y + itemH > paperH) continue

      items.push({
        photoId: p.photoId,
        instanceId: p.instanceId,
        x,
        y,
        widthMm: itemW,
        heightMm: itemH,
        rotated: useRotated,
      })

      rowHeight = Math.max(rowHeight, itemH)
      x += itemW + gapMm
    }
  }

  return {
    paper: paperSize,
    gapMm,
    items,
    paperWidthPx: mmToPx(paper.widthMm),
    paperHeightPx: mmToPx(paper.heightMm),
  }
}
