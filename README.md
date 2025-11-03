# 图片格式转换工具

一个基于 Next.js 和 Tailwind CSS 的图片格式转换工具站，支持 JFIF 和 WebP 格式转换为 JPG 格式。

## 功能特点

- ✅ **单个文件转换**：上传单个 JFIF 或 WebP 文件，自动转换为 JPG 格式
- ✅ **批量转换**：支持一次上传多个文件进行批量转换
- ✅ **打包下载**：批量转换完成后，可以打包成 ZIP 文件下载
- ✅ **本地处理**：所有转换操作在浏览器本地完成，保护隐私安全
- ✅ **格式支持**：支持 JFIF → JPG 和 WebP → JPG 格式转换

## 技术栈

- **框架**：Next.js 14 (App Router)
- **样式**：Tailwind CSS
- **语言**：TypeScript
- **打包工具**：JSZip（用于批量下载）

## 快速开始

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 开发模式

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看效果。

### 构建生产版本

```bash
npm run build
npm run start
```

## 项目结构

```
img2img/
├── app/
│   ├── layout.tsx          # 根布局组件
│   ├── page.tsx            # 主页
│   └── globals.css         # 全局样式
├── components/
│   └── ImageConverter.tsx  # 图片转换主组件
├── utils/
│   └── imageConverter.ts   # 图片转换工具函数
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## 使用说明

1. **上传文件**：点击上传区域或拖拽图片文件
2. **自动转换**：文件上传后自动开始转换
3. **单个下载**：点击文件项的"下载"按钮保存单个文件
4. **批量下载**：点击"打包下载"按钮下载所有转换后的文件（ZIP 格式）

## 浏览器兼容性

- Chrome/Edge (推荐)
- Firefox
- Safari
- Opera

需要支持 Canvas API 和 FileReader API 的现代浏览器。

## License

MIT

