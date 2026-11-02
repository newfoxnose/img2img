import type { Metadata } from 'next'
import ToolLayout from '@/components/shared/ToolLayout'

export const metadata: Metadata = {
  title: '日期计算 - 日期差与日期加减计算器',
  description:
    '免费在线日期计算工具，计算两个日期的时间间隔（年月日与总小时分钟），支持按天/周/月/年加减日期，显示星期、时间戳与常用格式。',
  keywords:
    '日期计算,日期差,天数计算,日期加减,两个日期相差天数,星期几,时间戳',
  alternates: {
    canonical: '/datecalc',
  },
  openGraph: {
    title: '日期计算 - 日期差与日期加减计算器',
    description:
      '计算两个日期的间隔与日期加减，支持年月日分解、星期显示、时间戳与常用格式复制。',
    type: 'website',
    locale: 'zh_CN',
  },
}

export default function DateCalcLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToolLayout>{children}</ToolLayout>
}
