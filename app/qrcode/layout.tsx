import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: '二维码工具 - 在线生成与识别二维码',
  description:
    '免费在线二维码工具，输入文本或网址即可生成二维码，支持自定义尺寸、容错级别与颜色，下载 PNG/SVG，也可上传图片识别二维码内容，全部本地处理。',
  keywords:
    '二维码,二维码生成,二维码识别,qrcode,在线二维码,生成二维码,扫码,PNG,SVG',
  alternates: {
    canonical: '/qrcode',
  },
  openGraph: {
    title: '二维码工具 - 在线生成与识别二维码',
    description:
      '在线生成二维码并下载 PNG/SVG，也可上传图片识别二维码内容，本地处理不上传。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function QrcodeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
