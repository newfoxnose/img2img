import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: '在线工具合集 - 图片处理、JSON格式化、var_dump格式化、GBK转GB2312',
  description:
    '免费在线工具合集，包含图片格式转换/证件照/图片分割、JSON格式化与校验、PHP var_dump输出美化、GBK转GB2312字符替换等实用工具。所有处理在浏览器本地完成，安全无需上传。',
  keywords:
    '在线工具,工具合集,图片格式转换,证件照制作,图片分割,JSON格式化,var_dump格式化,GBK转GB2312',
  openGraph: {
    title: '在线工具合集 - 图片处理与开发者实用工具',
    description:
      '免费在线工具合集：图片处理、JSON 格式化、PHP var_dump 格式化、GBK 转 GB2312，浏览器本地处理，安全便捷。',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Google AdSense */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6721623848988004"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased">
        {children}
        
        {/* Matomo 统计代码 */}
        <Script
          id="matomo-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              var _paq = window._paq = window._paq || [];
              /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
              _paq.push(['trackPageView']);
              _paq.push(['enableLinkTracking']);
              (function() {
                var u="//tongji.gm.ws/";
                _paq.push(['setTrackerUrl', u+'matomo.php']);
                _paq.push(['setSiteId', '14']);
                var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
                g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}

