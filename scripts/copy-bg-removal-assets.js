/**
 * 生成 @imgly/background-removal 运行时所需的本地资源到 public/bg-removal/
 *
 * 资源来源：
 * - onnxruntime-web 运行时（wasm + mjs glue）：来自 onnxruntime-web 包 dist
 *   库 1.7.0 固定请求 /onnxruntime-web/ort-wasm-simd-threaded.{wasm,mjs}
 * - 抠图模型 isnet_quint8（约 42MB）：来自 @imgly/background-removal-data 的
 *   /models/small 分块（small 在库内被映射为 isnet_quint8），按 offsets 顺序拼接为单文件
 *
 * 输出单文件 + 清单 resources.json（库 1.7.0 读取 chunk.name 构造下载 URL）
 *
 * 运行: node scripts/copy-bg-removal-assets.js
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'node_modules', '@imgly', 'background-removal-data', 'dist')
const ORT_DIST_DIR = path.join(__dirname, '..', 'node_modules', 'onnxruntime-web', 'dist')
const DEST_DIR = path.join(__dirname, '..', 'public', 'bg-removal')

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

/**
 * 拷贝单文件并生成单分块清单条目
 */
function copySingleFile(srcFile, destFileName, mime) {
  if (!fs.existsSync(srcFile)) {
    fail(`源文件不存在: ${srcFile}`)
  }
  const destFile = path.join(DEST_DIR, destFileName)
  fs.copyFileSync(srcFile, destFile)
  const size = fs.statSync(destFile).size
  return {
    entry: {
      chunks: [{ hash: destFileName, name: destFileName, offsets: [0, size] }],
      size,
      mime,
    },
    size,
  }
}

/**
 * 按清单分块顺序拼接模型为单文件
 */
function assembleModel(manifest, key, destFileName) {
  const entry = manifest[key]
  if (!entry) {
    fail(`数据包清单中不存在资源: ${key}`)
  }
  const destFile = path.join(DEST_DIR, destFileName)
  const buffers = entry.chunks.map((chunk) => {
    const srcFile = path.join(DATA_DIR, chunk.hash)
    if (!fs.existsSync(srcFile)) {
      fail(`缺少模型分块: ${chunk.hash}`)
    }
    return fs.readFileSync(srcFile)
  })
  fs.writeFileSync(destFile, Buffer.concat(buffers))
  const size = fs.statSync(destFile).size
  if (size !== entry.size) {
    fail(`模型拼接后大小 ${size} 与清单 ${entry.size} 不一致`)
  }
  return {
    entry: {
      chunks: [{ hash: destFileName, name: destFileName, offsets: [0, size] }],
      size,
      mime: 'application/octet-stream',
    },
    size,
  }
}

function main() {
  const manifestPath = path.join(DATA_DIR, 'resources.json')
  if (!fs.existsSync(manifestPath)) {
    fail('未找到 @imgly/background-removal-data，请先运行 npm install')
  }
  const dataManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

  // 清空目标目录，避免残留旧版本分块
  if (fs.existsSync(DEST_DIR)) {
    fs.rmSync(DEST_DIR, { recursive: true, force: true })
  }
  fs.mkdirSync(DEST_DIR, { recursive: true })

  const manifest = {}
  let totalBytes = 0

  // onnxruntime-web 运行时（CPU 路径固定使用 simd-threaded 变体）
  const wasm = copySingleFile(
    path.join(ORT_DIST_DIR, 'ort-wasm-simd-threaded.wasm'),
    'ort-wasm-simd-threaded.wasm',
    'application/wasm'
  )
  manifest['/onnxruntime-web/ort-wasm-simd-threaded.wasm'] = wasm.entry
  totalBytes += wasm.size

  const mjs = copySingleFile(
    path.join(ORT_DIST_DIR, 'ort-wasm-simd-threaded.mjs'),
    'ort-wasm-simd-threaded.mjs',
    'text/javascript'
  )
  manifest['/onnxruntime-web/ort-wasm-simd-threaded.mjs'] = mjs.entry
  totalBytes += mjs.size

  // 抠图模型：库将 small 映射为 isnet_quint8，对应数据包的 /models/small
  const model = assembleModel(dataManifest, '/models/small', 'isnet_quint8.onnx')
  manifest['/models/isnet_quint8'] = model.entry
  totalBytes += model.size

  fs.writeFileSync(path.join(DEST_DIR, 'resources.json'), JSON.stringify(manifest))

  // onnxruntime-web UMD 构建：通过 <script> 标签以全局 ort 加载，
  // 避免 webpack 打包 ort 时重写 import.meta.url 导致 Worker 创建失败
  const ortSrc = path.join(ORT_DIST_DIR, 'ort.min.js')
  const ortDestDir = path.join(__dirname, '..', 'public', 'ort')
  if (fs.existsSync(ortDestDir)) {
    fs.rmSync(ortDestDir, { recursive: true, force: true })
  }
  fs.mkdirSync(ortDestDir, { recursive: true })
  fs.copyFileSync(ortSrc, path.join(ortDestDir, 'ort.min.js'))
  const ortSize = fs.statSync(ortSrc).size
  totalBytes += ortSize

  console.log(`完成: ${DEST_DIR}`)
  console.log(`      ${ortDestDir}（ort.min.js ${(ortSize / 1024).toFixed(0)} KB）`)
  console.log(`共约 ${(totalBytes / 1024 / 1024).toFixed(1)} MB`)
}

main()
