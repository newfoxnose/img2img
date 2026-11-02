import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '图片处理工具 - 格式转换、压缩、证件照、图片分割',
  description:
    '免费在线图片处理工具：图片格式转换、质量压缩、尺寸调整、证件照制作与图片分割，支持批量处理、ZIP 打包下载和 AI 智能抠图换背景。',
  keywords:
    '图片格式转换,图片压缩,JPG,PNG,WebP,证件照制作,图片分割,在线图片处理,批量图片转换',
  alternates: {
    canonical: '/image',
  },
  openGraph: {
    title: '图片处理工具 - 格式转换、压缩、证件照、图片分割',
    description:
      '图片格式转换、压缩、证件照制作与图片分割，支持批量处理和 ZIP 下载。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function ImageLayout({ children }: { children: React.ReactNode }) {
  return children
}
