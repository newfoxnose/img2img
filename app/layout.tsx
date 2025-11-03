import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: '图片格式转换工具 - 多格式图片在线转换器',
  description: '免费在线图片格式转换工具，支持JPG、PNG、WebP、GIF、BMP、TIFF、SVG、ICO等多种格式转换，支持单个文件转换和批量转换，转换后可打包下载。快速、安全、无需上传服务器。',
  keywords: '图片格式转换,JPG转PNG,WebP转JPG,PNG转JPG,图片批量转换,在线图片转换器,图片格式转换工具',
  openGraph: {
    title: '图片格式转换工具 - 多格式图片在线转换器',
    description: '免费在线图片格式转换工具，支持JPG、PNG、WebP、GIF、BMP、TIFF、SVG、ICO等多种格式转换，支持单个文件转换和批量转换',
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

