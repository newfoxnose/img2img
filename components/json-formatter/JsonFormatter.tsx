'use client'

import React, { useState, useMemo } from 'react'
import { JsonFormatResult } from '@/hooks/useJsonFormatter'

interface JsonFormatterProps {
  result: JsonFormatResult
}

/**
 * JSON节点类型
 */
type JsonValue = string | number | boolean | null | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]

/**
 * JSON树节点属性
 */
interface JsonNodeProps {
  value: JsonValue
  keyName?: string | number
  level: number
  path: string
  collapsedPaths: Set<string>
  onToggleCollapse: (path: string) => void
  showComma?: boolean
}

/**
 * JSON树节点组件
 * 递归渲染JSON结构，支持折叠/展开
 */
function JsonNode({ value, keyName, level, path, collapsedPaths, onToggleCollapse, showComma = false }: JsonNodeProps) {
  const isCollapsed = collapsedPaths.has(path)
  const indent = level * 20

  /**
   * 渲染键名
   */
  const renderKey = () => {
    if (keyName === undefined) return null
    return (
      <span className="text-blue-600 font-semibold">
        {typeof keyName === 'string' ? `"${keyName}"` : keyName}:
      </span>
    )
  }

  /**
   * 渲染值
   */
  const renderValue = (val: JsonValue): React.ReactNode => {
    if (val === null) {
      return <span className="text-gray-500">null</span>
    }
    
    if (typeof val === 'string') {
      return <span className="text-green-600">"{val}"</span>
    }
    
    if (typeof val === 'number') {
      return <span className="text-orange-600">{val}</span>
    }
    
    if (typeof val === 'boolean') {
      return <span className="text-purple-600">{val ? 'true' : 'false'}</span>
    }
    
    return null
  }

  // 处理数组
  if (Array.isArray(value)) {
    const isEmpty = value.length === 0
    
    return (
      <div className="flex items-start" style={{ marginLeft: `${indent}px` }}>
        {keyName !== undefined && (
          <div className="flex items-center">
            {renderKey()}
            <span className="mx-1"> </span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center">
            {!isEmpty && (
              <button
                onClick={() => onToggleCollapse(path)}
                className="mr-2 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={isCollapsed ? '展开' : '折叠'}
              >
                {isCollapsed ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            )}
            <span className="text-gray-600">[</span>
            {isEmpty && <span className="text-gray-600">]</span>}
            {!isEmpty && isCollapsed && (
              <>
                <span className="text-gray-500 text-xs ml-2">
                  {value.length} {value.length === 1 ? 'item' : 'items'}
                </span>
                <span className="text-gray-600 ml-1">]</span>
              </>
            )}
          </div>
          
          {!isCollapsed && !isEmpty && (
            <div className="ml-6 mt-1">
              {value.map((item, index) => {
                const itemPath = `${path}[${index}]`
                const isLast = index === value.length - 1
                return (
                  <JsonNode
                    key={index}
                    value={item}
                    keyName={index}
                    level={level + 1}
                    path={itemPath}
                    collapsedPaths={collapsedPaths}
                    onToggleCollapse={onToggleCollapse}
                    showComma={!isLast}
                  />
                )
              })}
              <div style={{ marginLeft: `${indent}px` }} className="flex items-center">
                <span className="text-gray-600">]</span>
                {showComma && <span className="text-gray-400 ml-1">,</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 处理对象
  if (typeof value === 'object' && value !== null) {
    const obj = value as JsonObject
    const keys = Object.keys(obj)
    const isEmpty = keys.length === 0
    
    return (
      <div className="flex items-start" style={{ marginLeft: `${indent}px` }}>
        {keyName !== undefined && (
          <div className="flex items-center">
            {renderKey()}
            <span className="mx-1"> </span>
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center">
            {!isEmpty && (
              <button
                onClick={() => onToggleCollapse(path)}
                className="mr-2 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                aria-label={isCollapsed ? '展开' : '折叠'}
              >
                {isCollapsed ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            )}
            <span className="text-gray-600">{'{'}</span>
            {isEmpty && <span className="text-gray-600">{'}'}</span>}
            {!isEmpty && isCollapsed && (
              <>
                <span className="text-gray-500 text-xs ml-2">
                  {keys.length} {keys.length === 1 ? 'key' : 'keys'}
                </span>
                <span className="text-gray-600 ml-1">{'}'}</span>
              </>
            )}
          </div>
          
          {!isCollapsed && !isEmpty && (
            <div className="ml-6 mt-1">
              {keys.map((key, index) => {
                const keyPath = `${path}.${key}`
                const isLast = index === keys.length - 1
                return (
                  <JsonNode
                    key={key}
                    value={obj[key]}
                    keyName={key}
                    level={level + 1}
                    path={keyPath}
                    collapsedPaths={collapsedPaths}
                    onToggleCollapse={onToggleCollapse}
                    showComma={!isLast}
                  />
                )
              })}
              <div style={{ marginLeft: `${indent}px` }} className="flex items-center">
                <span className="text-gray-600">{'}'}</span>
                {showComma && <span className="text-gray-400 ml-1">,</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 处理基本类型
  return (
    <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
      {renderKey()}
      {keyName !== undefined && <span className="mx-1"> </span>}
      {renderValue(value)}
      {showComma && <span className="text-gray-400 ml-1">,</span>}
    </div>
  )
}

/**
 * JSON格式化显示组件
 * 显示格式化后的JSON，支持语法高亮、折叠展开和复制功能
 */
export default function JsonFormatter({ result }: JsonFormatterProps) {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'formatted' | 'minified' | 'tree'>('tree')
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())

  /**
   * 解析JSON为对象
   */
  const parsedJson = useMemo(() => {
    try {
      return JSON.parse(result.formatted)
    } catch {
      return null
    }
  }, [result.formatted])

  /**
   * 切换折叠状态
   */
  const toggleCollapse = (path: string) => {
    const newCollapsed = new Set(collapsedPaths)
    if (newCollapsed.has(path)) {
      newCollapsed.delete(path)
    } else {
      newCollapsed.add(path)
    }
    setCollapsedPaths(newCollapsed)
  }

  /**
   * 展开所有节点
   */
  const expandAll = () => {
    setCollapsedPaths(new Set())
  }

  /**
   * 折叠所有节点
   */
  const collapseAll = () => {
    if (!parsedJson) return
    
    const collectPaths = (value: JsonValue, path: string, paths: Set<string>): void => {
      if (Array.isArray(value) && value.length > 0) {
        paths.add(path)
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            collectPaths(item, `${path}[${index}]`, paths)
          }
        })
      } else if (typeof value === 'object' && value !== null) {
        const obj = value as JsonObject
        const keys = Object.keys(obj)
        if (keys.length > 0) {
          paths.add(path)
          keys.forEach(key => {
            const val = obj[key]
            if (typeof val === 'object' && val !== null) {
              collectPaths(val, `${path}.${key}`, paths)
            }
          })
        }
      }
    }
    
    const allPaths = new Set<string>()
    collectPaths(parsedJson, 'root', allPaths)
    setCollapsedPaths(allPaths)
  }

  /**
   * 复制到剪贴板
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  /**
   * 高亮JSON语法（用于文本模式）
   */
  const highlightJson = (json: string): string => {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-gray-800'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-blue-600 font-semibold' // 键名
          } else {
            cls = 'text-green-600' // 字符串值
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-600' // 布尔值
        } else if (/null/.test(match)) {
          cls = 'text-gray-500' // null
        } else {
          cls = 'text-orange-600' // 数字
        }
        return `<span class="${cls}">${match}</span>`
      })
  }

  const displayText = viewMode === 'formatted' ? result.formatted : result.minified
  const highlightedHtml = highlightJson(displayText)

  return (
    <div className="space-y-4">
      {/* 视图模式切换和操作按钮 */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex space-x-2 flex-wrap">
          <button
            onClick={() => setViewMode('tree')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'tree'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            树形视图
          </button>
          <button
            onClick={() => setViewMode('formatted')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'formatted'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            格式化
          </button>
          <button
            onClick={() => setViewMode('minified')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'minified'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            压缩
          </button>
        </div>
        
        <div className="flex space-x-2 flex-wrap">
          {viewMode === 'tree' && (
            <>
              <button
                onClick={expandAll}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                展开全部
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                折叠全部
              </button>
            </>
          )}
          <button
            onClick={() => copyToClipboard(viewMode === 'tree' ? result.formatted : displayText)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{copied ? '已复制!' : '复制'}</span>
          </button>
        </div>
      </div>

      {/* JSON显示区域 */}
      <div className="relative">
        {viewMode === 'tree' && parsedJson ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-96 font-mono text-sm">
            <JsonNode
              value={parsedJson}
              level={0}
              path="root"
              collapsedPaths={collapsedPaths}
              onToggleCollapse={toggleCollapse}
            />
          </div>
        ) : (
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto max-h-96 font-mono text-sm">
            <code
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              className="block whitespace-pre"
            />
          </pre>
        )}
        
        {/* 统计信息 */}
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>
            字符数: {viewMode === 'tree' ? result.formatted.length : displayText.length}
          </span>
          <span>
            行数: {viewMode === 'tree' ? result.formatted.split('\n').length : displayText.split('\n').length}
          </span>
        </div>
      </div>
    </div>
  )
}
