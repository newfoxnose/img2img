/**
 * 拼接图手动划线切割工具
 * 用户在图上画出大致切割位置，工具沿划线自动查找真实边线：
 * 1. 白色/纯色分隔缝 → 吸附到缝隙中心
 * 2. 两张图片直接相接 → 吸附到相邻列/行差异最大的边界
 *
 * 切割线保留划线的起止范围，因此支持不贯穿整幅图的线（T 型/丁字路口分割）。
 */

import { type OutputFormat, FORMAT_CONFIGS } from './imageConverter'

export type CutOrientation = 'vertical' | 'horizontal'
export type CutMethod = 'gutter' | 'edge'

export interface SnapHint {
  /** 切割线方向：竖向线用于左右切割，横向线用于上下切割 */
  orientation: CutOrientation
  /** 划线的大致位置（原图像素，竖向线为 x，横向线为 y） */
  position: number
  /** 划线在另一方向上的起点（原图像素） */
  spanStart: number
  /** 划线在另一方向上的终点（原图像素） */
  spanEnd: number
}

export interface SnapOptions {
  /** 白边颜色容差（0-255） */
  tolerance?: number
  /** 吸附搜索半径（原图像素） */
  searchRadius?: number
}

export interface SnappedCut {
  orientation: CutOrientation
  /** 吸附后的切割位置（原图像素） */
  position: number
  /** 切割线起点（原图像素，竖向线为 y，横向线为 x） */
  spanStart: number
  /** 切割线终点（原图像素，竖向线为 y，横向线为 x） */
  spanEnd: number
  /** 吸附依据：白边空隙 / 图片边缘 */
  method: CutMethod
}

export interface CutCell {
  x: number
  y: number
  width: number
  height: number
}

interface GridCell extends CutCell {}

interface Region extends CutCell {
  cells: GridCell[]
}

// 分析时使用的最大边长
const ANALYSIS_MAX_SIZE = 1600
// 判定白边的空白像素占比
const GUTTER_RATIO = 0.97
// 划线过短时改用整段进行判定
const MIN_SPAN_RATIO = 0.1

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败，请确保文件是有效的图片格式'))
    }
    img.src = url
  })
}

/**
 * 图片切割工具：持有图片与分析数据，支持吸附划线位置并执行切割
 */
export class ImageCutTool {
  readonly imageWidth: number
  readonly imageHeight: number

  private readonly img: HTMLImageElement
  private readonly scale: number
  private readonly aw: number
  private readonly ah: number
  private readonly data: Uint8ClampedArray
  private readonly bg: { r: number; g: number; b: number }

  static async create(file: File): Promise<ImageCutTool> {
    const img = await loadImage(file)
    return new ImageCutTool(img)
  }

  private constructor(img: HTMLImageElement) {
    this.img = img
    this.imageWidth = img.naturalWidth || img.width
    this.imageHeight = img.naturalHeight || img.height

    const scale = Math.min(
      1,
      ANALYSIS_MAX_SIZE / Math.max(this.imageWidth, this.imageHeight)
    )
    this.scale = scale
    this.aw = Math.max(1, Math.round(this.imageWidth * scale))
    this.ah = Math.max(1, Math.round(this.imageHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = this.aw
    canvas.height = this.ah
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('无法创建 Canvas 上下文')
    ctx.drawImage(img, 0, 0, this.aw, this.ah)
    this.data = ctx.getImageData(0, 0, this.aw, this.ah).data
    this.bg = this.detectBackground()
  }

  /**
   * 从图片四周采样，取出现最多的颜色作为白边背景色
   */
  private detectBackground(): { r: number; g: number; b: number } {
    const { aw, ah, data } = this
    const frame = Math.max(1, Math.round(Math.min(aw, ah) * 0.02))
    const stride = Math.max(1, Math.floor(Math.min(aw, ah) / 400))
    const counts = new Map<number, number>()

    for (let y = 0; y < ah; y += stride) {
      const edgeRow = y < frame || y >= ah - frame
      for (let x = 0; x < aw; x += stride) {
        if (!edgeRow && x >= frame && x < aw - frame) continue
        const idx = (y * aw + x) * 4
        if (data[idx + 3] < 24) continue
        const key =
          ((data[idx] >> 4) << 8) |
          ((data[idx + 1] >> 4) << 4) |
          (data[idx + 2] >> 4)
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }

    let bg = { r: 255, g: 255, b: 255 }
    let bestCount = 0
    counts.forEach((count, key) => {
      if (count > bestCount) {
        bestCount = count
        bg = {
          r: ((key >> 8) & 0xf) * 16 + 8,
          g: ((key >> 4) & 0xf) * 16 + 8,
          b: (key & 0xf) * 16 + 8,
        }
      }
    })
    return bg
  }

  private isEmptyPixel(idx: number, tolerance: number): boolean {
    const { data, bg } = this
    if (data[idx + 3] < 24) return true
    return (
      Math.abs(data[idx] - bg.r) <= tolerance &&
      Math.abs(data[idx + 1] - bg.g) <= tolerance &&
      Math.abs(data[idx + 2] - bg.b) <= tolerance
    )
  }

  /**
   * 沿划线吸附真实边线
   */
  snap(hint: SnapHint, options: SnapOptions = {}): SnappedCut | null {
    const tolerance = clamp(Math.round(options.tolerance ?? 16), 0, 255)
    const radiusPx = clamp(Math.round(options.searchRadius ?? 30), 2, 400)
    const isVertical = hint.orientation === 'vertical'

    const axisLen = isVertical ? this.aw : this.ah
    const spanLen = isVertical ? this.ah : this.aw
    const originalAxisLen = isVertical ? this.imageWidth : this.imageHeight
    const originalSpanLen = isVertical ? this.imageHeight : this.imageWidth

    const radius = Math.max(2, Math.round(radiusPx * this.scale))
    const hintAxis = clamp(Math.round(hint.position * this.scale), 1, axisLen - 2)
    const lo = Math.max(0, hintAxis - radius)
    const hi = Math.min(axisLen - 1, hintAxis + radius)

    const rawSpanStart = clamp(
      Math.min(hint.spanStart, hint.spanEnd),
      0,
      originalSpanLen
    )
    const rawSpanEnd = clamp(
      Math.max(hint.spanStart, hint.spanEnd),
      0,
      originalSpanLen
    )

    // 用于边线判定的范围：划线太短时改用整段，保证有足够样本
    let spanStart = Math.round(rawSpanStart * this.scale)
    let spanEnd = Math.round(rawSpanEnd * this.scale)
    spanStart = clamp(spanStart, 0, spanLen - 1)
    spanEnd = clamp(spanEnd, spanStart + 1, spanLen)
    if (spanEnd - spanStart < Math.max(2, Math.round(spanLen * MIN_SPAN_RATIO))) {
      spanStart = 0
      spanEnd = spanLen
    }

    const pixelIndex = (axis: number, span: number) =>
      isVertical ? (span * this.aw + axis) * 4 : (axis * this.aw + span) * 4

    // 1. 查找白边/纯色分隔缝
    // 分隔缝通常较窄；过宽的同色区域属于图片内容，不能当作缝隙（避免直接相接的纯色图片被误判）
    const maxGutterWidth = Math.max(2, Math.round(axisLen * 0.15))
    let bestRun: { center: number; distance: number } | null = null
    let cursor = 0
    while (cursor < axisLen) {
      if (!this.isGutterColumnOrRow(isVertical, cursor, spanStart, spanEnd, tolerance)) {
        cursor++
        continue
      }
      const runStart = cursor
      while (
        cursor < axisLen &&
        this.isGutterColumnOrRow(isVertical, cursor, spanStart, spanEnd, tolerance)
      ) {
        cursor++
      }
      // 完整测量缝隙宽度，被搜索窗口截断的同色区域不算缝隙
      if (cursor - runStart > maxGutterWidth) continue

      const center = (runStart + cursor - 1) / 2
      if (center < lo || center > hi) continue

      const distance = Math.abs(center - hintAxis)
      if (!bestRun || distance < bestRun.distance) {
        bestRun = { center, distance }
      }
    }

    const base = {
      orientation: hint.orientation,
      spanStart: Math.round(rawSpanStart),
      spanEnd: Math.round(rawSpanEnd),
    }

    if (bestRun) {
      return {
        ...base,
        position: clamp(Math.round(bestRun.center / this.scale), 1, originalAxisLen - 1),
        method: 'gutter',
      }
    }

    // 2. 查找两张图片直接相接的强边界：相邻列/行差异的中位数最大处
    let bestBoundary = -1
    let bestScore = -1
    const spanCount = spanEnd - spanStart
    const diffs = new Float32Array(spanCount)

    for (
      let boundary = Math.max(1, lo);
      boundary <= Math.min(axisLen - 1, hi);
      boundary++
    ) {
      for (let s = 0; s < spanCount; s++) {
        const span = spanStart + s
        const left = pixelIndex(boundary - 1, span)
        const right = pixelIndex(boundary, span)
        const alphaDiff = Math.abs(this.data[right + 3] - this.data[left + 3])
        const colorDiff = Math.max(
          Math.abs(this.data[right] - this.data[left]),
          Math.abs(this.data[right + 1] - this.data[left + 1]),
          Math.abs(this.data[right + 2] - this.data[left + 2])
        )
        diffs[s] = Math.max(alphaDiff, colorDiff)
      }

      const sorted = Array.from(diffs).sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      if (median > bestScore) {
        bestScore = median
        bestBoundary = boundary
      }
    }

    if (bestBoundary < 0) return null

    return {
      ...base,
      position: clamp(Math.round(bestBoundary / this.scale), 1, originalAxisLen - 1),
      method: 'edge',
    }
  }

  /**
   * 判断某一列（竖向切割）或某一行（横向切割）在指定范围内是否接近纯背景
   */
  private isGutterColumnOrRow(
    isVertical: boolean,
    axis: number,
    spanStart: number,
    spanEnd: number,
    tolerance: number
  ): boolean {
    let blank = 0
    for (let span = spanStart; span < spanEnd; span++) {
      const idx = isVertical
        ? (span * this.aw + axis) * 4
        : (axis * this.aw + span) * 4
      if (this.isEmptyPixel(idx, tolerance)) blank++
    }
    return blank >= (spanEnd - spanStart) * GUTTER_RATIO
  }

  /**
   * 计算当前切割线会生成多少个区域
   */
  countRegions(lines: SnappedCut[]): number {
    return this.buildPartition(lines).length
  }

  /**
   * 按切割线将图片切分为多张
   */
  async split(
    lines: SnappedCut[],
    outputFormat: OutputFormat = 'jpg'
  ): Promise<{ blobs: Blob[]; cells: CutCell[] }> {
    const regions = this.buildPartition(lines)
    const config = FORMAT_CONFIGS[outputFormat]

    const blobs = await Promise.all(
      regions.map(
        (region) =>
          new Promise<Blob>((resolve, reject) => {
            const canvas = document.createElement('canvas')
            canvas.width = region.width
            canvas.height = region.height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              reject(new Error('无法创建 Canvas 上下文'))
              return
            }

            if (outputFormat !== 'png') {
              ctx.fillStyle = '#FFFFFF'
              ctx.fillRect(0, 0, canvas.width, canvas.height)
            }

            // 逐个网格绘制，非矩形区域外保持背景色/透明
            region.cells.forEach((cell) => {
              ctx.drawImage(
                this.img,
                cell.x,
                cell.y,
                cell.width,
                cell.height,
                cell.x - region.x,
                cell.y - region.y,
                cell.width,
                cell.height
              )
            })

            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob)
                else reject(new Error('图片切割失败'))
              },
              config.mimeType,
              config.quality
            )
          })
      )
    )

    return {
      blobs,
      cells: regions.map(({ x, y, width, height }) => ({ x, y, width, height })),
    }
  }

  /**
   * 把切割线两端自动延长到最近的边界：
   * 优先延长到会与它相交的另一方向切割线，否则延长到图片边缘。
   * 由于延长可能让更多线相交，这里迭代到稳定为止。
   */
  resolveLines(lines: SnappedCut[]): SnappedCut[] {
    const W = this.imageWidth
    const H = this.imageHeight
    const EPS = 0.5

    const resolved: SnappedCut[] = lines.map((line) => {
      const spanLen = line.orientation === 'vertical' ? H : W
      const start = clamp(line.spanStart, 0, spanLen)
      const end = clamp(line.spanEnd, 0, spanLen)
      return {
        ...line,
        spanStart: Math.min(start, end),
        spanEnd: Math.max(start, end),
      }
    })

    const verticals = resolved.filter((line) => line.orientation === 'vertical')
    const horizontals = resolved.filter(
      (line) => line.orientation === 'horizontal'
    )

    const maxPasses = resolved.length * 2 + 4

    for (let pass = 0; pass < maxPasses; pass++) {
      let changed = false

      // 竖向线：向上下延长到最近的水平切割线或图片上下边缘
      verticals.forEach((v) => {
        let newStart = 0
        let newEnd = H

        horizontals.forEach((h) => {
          const coversX =
            h.spanStart - EPS <= v.position && v.position <= h.spanEnd + EPS
          if (!coversX) return

          if (h.position <= v.spanStart + EPS && h.position > newStart) {
            newStart = h.position
          }
          if (h.position >= v.spanEnd - EPS && h.position < newEnd) {
            newEnd = h.position
          }
        })

        newStart = clamp(newStart, 0, H)
        newEnd = clamp(newEnd, 0, H)

        if (newStart < v.spanStart - EPS || newEnd > v.spanEnd + EPS) {
          changed = true
        }
        v.spanStart = Math.min(v.spanStart, newStart)
        v.spanEnd = Math.max(v.spanEnd, newEnd)
      })

      // 横向线：向左右延长到最近的竖向切割线或图片左右边缘
      horizontals.forEach((h) => {
        let newStart = 0
        let newEnd = W

        verticals.forEach((v) => {
          const coversY =
            v.spanStart - EPS <= h.position && h.position <= v.spanEnd + EPS
          if (!coversY) return

          if (v.position <= h.spanStart + EPS && v.position > newStart) {
            newStart = v.position
          }
          if (v.position >= h.spanEnd - EPS && v.position < newEnd) {
            newEnd = v.position
          }
        })

        newStart = clamp(newStart, 0, W)
        newEnd = clamp(newEnd, 0, W)

        if (newStart < h.spanStart - EPS || newEnd > h.spanEnd + EPS) {
          changed = true
        }
        h.spanStart = Math.min(h.spanStart, newStart)
        h.spanEnd = Math.max(h.spanEnd, newEnd)
      })

      if (!changed) break
    }

    return resolved
  }

  /**
   * 根据切割线构建网格分区：相邻网格若没有被切割线完全隔开则合并
   */
  private buildPartition(lines: SnappedCut[]): Region[] {
    const W = this.imageWidth
    const H = this.imageHeight
    const resolved = this.resolveLines(lines)

    const xs = Array.from(
      new Set([
        0,
        W,
        ...resolved
          .filter((line) => line.orientation === 'vertical')
          .map((line) => clamp(Math.round(line.position), 1, W - 1)),
      ])
    ).sort((a, b) => a - b)

    const ys = Array.from(
      new Set([
        0,
        H,
        ...resolved
          .filter((line) => line.orientation === 'horizontal')
          .map((line) => clamp(Math.round(line.position), 1, H - 1)),
      ])
    ).sort((a, b) => a - b)

    const nx = xs.length - 1
    const ny = ys.length - 1
    if (nx <= 0 || ny <= 0) {
      return [
        {
          x: 0,
          y: 0,
          width: W,
          height: H,
          cells: [{ x: 0, y: 0, width: W, height: H }],
        },
      ]
    }

    const parent = new Int32Array(nx * ny)
    for (let i = 0; i < parent.length; i++) parent[i] = i

    const find = (index: number): number => {
      let current = index
      while (parent[current] !== current) {
        parent[current] = parent[parent[current]]
        current = parent[current]
      }
      return current
    }

    const union = (a: number, b: number) => {
      const rootA = find(a)
      const rootB = find(b)
      if (rootA !== rootB) parent[rootB] = rootA
    }

    const cellIndex = (i: number, j: number) => j * nx + i

    const verticals = resolved.filter((line) => line.orientation === 'vertical')
    const horizontals = resolved.filter(
      (line) => line.orientation === 'horizontal'
    )

    // 竖向边界：若切割线完整覆盖该段 y 区间，则左右两侧不相连
    for (let k = 1; k < xs.length - 1; k++) {
      const boundaryCuts = verticals.filter(
        (line) => Math.abs(line.position - xs[k]) < 0.5
      )
      if (boundaryCuts.length === 0) continue

      for (let j = 0; j < ny; j++) {
        const y0 = ys[j]
        const y1 = ys[j + 1]
        const separated = boundaryCuts.some(
          (line) => line.spanStart <= y0 + 0.5 && line.spanEnd >= y1 - 0.5
        )
        if (!separated) union(cellIndex(k - 1, j), cellIndex(k, j))
      }
    }

    // 横向边界：若切割线完整覆盖该段 x 区间，则上下两侧不相连
    for (let m = 1; m < ys.length - 1; m++) {
      const boundaryCuts = horizontals.filter(
        (line) => Math.abs(line.position - ys[m]) < 0.5
      )
      if (boundaryCuts.length === 0) continue

      for (let i = 0; i < nx; i++) {
        const x0 = xs[i]
        const x1 = xs[i + 1]
        const separated = boundaryCuts.some(
          (line) => line.spanStart <= x0 + 0.5 && line.spanEnd >= x1 - 0.5
        )
        if (!separated) union(cellIndex(i, m - 1), cellIndex(i, m))
      }
    }

    const groups = new Map<number, GridCell[]>()
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const root = find(cellIndex(i, j))
        const cell: GridCell = {
          x: xs[i],
          y: ys[j],
          width: xs[i + 1] - xs[i],
          height: ys[j + 1] - ys[j],
        }
        const list = groups.get(root)
        if (list) list.push(cell)
        else groups.set(root, [cell])
      }
    }

    const regions: Region[] = Array.from(groups.values()).map((cells) => {
      const minX = Math.min(...cells.map((cell) => cell.x))
      const minY = Math.min(...cells.map((cell) => cell.y))
      const maxX = Math.max(...cells.map((cell) => cell.x + cell.width))
      const maxY = Math.max(...cells.map((cell) => cell.y + cell.height))
      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        cells,
      }
    })

    // 按从上到下、从左到右的顺序输出
    regions.sort((a, b) => a.y - b.y || a.x - b.x)
    return regions
  }
}
