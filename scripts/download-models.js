/**
 * 下载 face-api.js 模型文件的脚本
 * 运行: node scripts/download-models.js
 */

const https = require('https')
const fs = require('fs')
const path = require('path')

// 模型文件列表
const models = [
  {
    name: 'tiny_face_detector_model-weights_manifest.json',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/tiny_face_detector_model-weights_manifest.json',
  },
  {
    name: 'tiny_face_detector_model-shard1',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/tiny_face_detector_model-shard1',
  },
  {
    name: 'face_landmark_68_model-weights_manifest.json',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/face_landmark_68_model-weights_manifest.json',
  },
  {
    name: 'face_landmark_68_model-shard1',
    url: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/face_landmark_68_model-shard1',
  },
]

// 模型目录
const modelsDir = path.join(__dirname, '..', 'public', 'models')

// 确保目录存在
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true })
}

/**
 * 下载文件
 */
function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)
    
    https.get(url, (response) => {
      // 处理重定向
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, filepath)
          .then(resolve)
          .catch(reject)
      }
      
      if (response.statusCode !== 200) {
        file.close()
        fs.unlinkSync(filepath)
        reject(new Error(`下载失败: ${response.statusCode}`))
        return
      }
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', (err) => {
      file.close()
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }
      reject(err)
    })
  })
}

/**
 * 主函数
 */
async function main() {
  console.log('开始下载 face-api.js 模型文件...\n')
  console.log('模型目录:', modelsDir)
  console.log('')

  for (const model of models) {
    const filepath = path.join(modelsDir, model.name)
    
    // 检查文件是否已存在
    if (fs.existsSync(filepath)) {
      console.log(`✓ ${model.name} (已存在，跳过)`)
      continue
    }
    
    try {
      console.log(`下载中: ${model.name}...`)
      await downloadFile(model.url, filepath)
      const stats = fs.statSync(filepath)
      const sizeKB = (stats.size / 1024).toFixed(2)
      console.log(`✓ ${model.name} (${sizeKB} KB)`)
    } catch (error) {
      console.error(`✗ ${model.name} 下载失败:`, error.message)
    }
  }
  
  console.log('\n下载完成！')
  console.log('模型文件已保存到:', modelsDir)
}

main().catch(console.error)

