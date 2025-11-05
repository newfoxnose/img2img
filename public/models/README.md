# Face-api.js 模型文件

本目录用于存放 face-api.js 的人脸检测模型文件。

## 模型文件列表

需要下载以下模型文件：

1. **tiny_face_detector_model-weights_manifest.json**
2. **tiny_face_detector_model-shard1**
3. **face_landmark_68_model-weights_manifest.json**
4. **face_landmark_68_model-shard1**

## 下载方式

### 方式一：使用下载脚本（推荐）

运行以下命令下载模型文件：

```bash
npm run download-models
```

### 方式二：手动下载

1. 访问模型文件 CDN 地址：
   - https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/tiny_face_detector_model-weights_manifest.json
   - https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/tiny_face_detector_model-shard1
   - https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/face_landmark_68_model-weights_manifest.json
   - https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/face_landmark_68_model-shard1

2. 将下载的文件保存到此目录

## 文件结构

下载完成后，目录结构应该如下：

```
public/models/
├── tiny_face_detector_model-weights_manifest.json
├── tiny_face_detector_model-shard1
├── face_landmark_68_model-weights_manifest.json
└── face_landmark_68_model-shard1
```

## 注意事项

- 模型文件总大小约 2-3MB
- 下载后可以离线使用人脸检测功能
- 如果模型文件不存在，系统会自动从 CDN 加载（需要网络连接）

