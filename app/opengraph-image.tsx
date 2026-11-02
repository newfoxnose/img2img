import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '在线工具合集 - 图片处理与开发者实用工具'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 45%, #f5f3ff 100%)',
          color: '#111827',
        }}
      >
        <div style={{ fontSize: 34, color: '#2563eb', fontWeight: 700, marginBottom: 18 }}>
          ONLINE TOOLS
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.15 }}>
          All-in-one Web Tools
        </div>
        <div style={{ fontSize: 34, color: '#4b5563', marginTop: 24 }}>
          Image · Encode · Hash · JSON · Time · Network
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 48 }}>
          {['Local Processing', 'Free', 'No Login'].map((item) => (
            <div
              key={item}
              style={{
                padding: '10px 22px',
                borderRadius: 999,
                background: '#ffffff',
                border: '1px solid #dbeafe',
                color: '#1d4ed8',
                fontSize: 24,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  )
}
