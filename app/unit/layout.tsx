import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: '单位换算 - 长度/面积/重量/温度/存储/时间换算器',
  description:
    '免费在线单位换算工具，支持长度、面积、重量、温度、数据存储与时间单位互转，显示全部单位对照结果，本地计算。',
  keywords:
    '单位换算,长度换算,面积换算,重量换算,温度换算,存储换算,KG转斤,英寸换算,亩换算',
  alternates: {
    canonical: '/unit',
  },
  openGraph: {
    title: '单位换算 - 长度/面积/重量/温度/存储/时间换算器',
    description:
      '支持长度、面积、重量、温度、数据存储与时间单位换算，实时显示所有单位对照结果。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function UnitLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
