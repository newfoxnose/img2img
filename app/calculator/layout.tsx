import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: '计算器 - 在线科学计算器与四则运算',
  description:
    '免费在线计算器，支持四则运算、括号、百分号、幂运算与三角函数、对数等科学函数，可键盘输入、保存历史记录，本地计算。',
  keywords:
    '计算器,在线计算器,科学计算器,四则运算,三角函数计算,对数计算,幂运算,百分号计算',
  alternates: {
    canonical: '/calculator',
  },
  openGraph: {
    title: '计算器 - 在线科学计算器与四则运算',
    description:
      '支持四则运算、括号、百分号与科学函数的在线计算器，键盘输入、历史记录，全部本地计算。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
