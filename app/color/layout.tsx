import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: '颜色转换工具 - HEX / RGB / HSL / HSV / CMYK 在线互转',
  description:
    '免费在线颜色转换工具，支持 HEX、RGB、RGBA、HSL、HSV、CMYK 互转，提供取色器、色板生成与文字前景色建议，全部在浏览器本地处理。',
  keywords:
    '颜色转换,hex转rgb,rgb转hex,hex转hsl,hsl转rgb,取色器,色板,颜色代码,颜色工具',
  alternates: {
    canonical: '/color',
  },
  openGraph: {
    title: '颜色转换工具 - HEX / RGB / HSL / HSV / CMYK 在线互转',
    description:
      'HEX、RGB、HSL、HSV 颜色互转，提供取色器、色板与亮度对比度提示。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function ColorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
