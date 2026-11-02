'use client'

import { useRef, type ChangeEvent } from 'react'

interface CameraUploadButtonProps {
  /** 选择文件后的回调，调用方同步读取 FileList 即可 */
  onSelect: (files: FileList | null) => void
  label?: string
  className?: string
}

const DEFAULT_CLASS =
  'inline-flex items-center gap-2 px-6 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors font-medium dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20'

/**
 * 移动端拍照上传按钮
 * 使用 capture="environment" 直接调起后置摄像头；桌面浏览器会忽略 capture，退化为普通文件选择
 */
export default function CameraUploadButton({
  onSelect,
  label = '拍照上传',
  className = DEFAULT_CLASS,
}: CameraUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    onSelect(files)
    // 延迟清空，避免调用方尚未同步读取 FileList 时被清空
    window.setTimeout(() => {
      if (inputRef.current) inputRef.current.value = ''
    }, 0)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
        aria-label={label}
      />
      <button type="button" onClick={() => inputRef.current?.click()} className={className}>
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
          />
          <circle cx="12" cy="13" r="4" strokeWidth={2} />
        </svg>
        {label}
      </button>
    </>
  )
}
