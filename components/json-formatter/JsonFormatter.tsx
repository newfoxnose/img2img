'use client'

import React, { useState, useMemo } from 'react'
import { JsonFormatResult } from '@/hooks/useJsonFormatter'

type OutputMode = 'formatted' | 'minified'

interface JsonFormatterProps {
  result: JsonFormatResult
  outputMode: OutputMode
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
      <span className="text-blue-600 dark:text-blue-400 font-semibold">
        {typeof keyName === 'string' ? `"${keyName}"` : keyName}:
      </span>
    )
  }

  /**
   * 渲染值
   */
  const renderValue = (val: JsonValue): React.ReactNode => {
    if (val === null) {
      return <span className="text-gray-500 dark:text-gray-400">null</span>
    }
    
    if (typeof val === 'string') {
      return <span className="text-green-600 dark:text-green-400">"{val}"</span>
    }
    
    if (typeof val === 'number') {
      return <span className="text-orange-600 dark:text-orange-400">{val}</span>
    }
    
    if (typeof val === 'boolean') {
      return <span className="text-purple-600 dark:text-purple-400">{val ? 'true' : 'false'}</span>
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
                type="button"
                onClick={() => onToggleCollapse(path)}
                className="mr-2 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
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
            <span className="text-gray-600 dark:text-gray-400">[</span>
            {isEmpty && <span className="text-gray-600 dark:text-gray-400">]</span>}
            {!isEmpty && isCollapsed && (
              <>
                <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                  {value.length} {value.length === 1 ? 'item' : 'items'}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">]</span>
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
                <span className="text-gray-600 dark:text-gray-400">]</span>
                {showComma && <span className="text-gray-400 dark:text-gray-500 ml-1">,</span>}
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
                type="button"
                onClick={() => onToggleCollapse(path)}
                className="mr-2 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
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
            <span className="text-gray-600 dark:text-gray-400">{'{'}</span>
            {isEmpty && <span className="text-gray-600 dark:text-gray-400">{'}'}</span>}
            {!isEmpty && isCollapsed && (
              <>
                <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                  {keys.length} {keys.length === 1 ? 'key' : 'keys'}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">{'}'}</span>
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
                <span className="text-gray-600 dark:text-gray-400">{'}'}</span>
                {showComma && <span className="text-gray-400 dark:text-gray-500 ml-1">,</span>}
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
      {showComma && <span className="text-gray-400 dark:text-gray-500 ml-1">,</span>}
    </div>
  )
}

/**
 * JSON格式化显示组件
 * 显示格式化后的JSON，支持语法高亮、折叠展开
 * 文本模式跟随输出模式（格式化/压缩）切换
 */
export default function JsonFormatter({ result, outputMode }: JsonFormatterProps) {
  const [viewMode, setViewMode] = useState<'tree' | 'text'>('tree')
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
   * 高亮JSON语法（用于文本模式）
   */
  const highlightJson = (json: string): string => {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'text-gray-800 dark:text-gray-100'
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-blue-600 dark:text-blue-400 font-semibold' // 键名
          } else {
            cls = 'text-green-600 dark:text-green-400' // 字符串值
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-purple-600 dark:text-purple-400' // 布尔值
        } else if (/null/.test(match)) {
          cls = 'text-gray-500 dark:text-gray-400' // null
        } else {
          cls = 'text-orange-600 dark:text-orange-400' // 数字
        }
        return `<span class="${cls}">${match}</span>`
      })
  }

  const displayText = outputMode === 'formatted' ? result.formatted : result.minified
  const highlightedHtml = highlightJson(
    viewMode === 'text' ? displayText : result.formatted
  )
  const statsText = viewMode === 'text' ? displayText : result.formatted

  return (
    <div className="space-y-4">
      {/* 视图模式切换和操作按钮 */}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div className="flex space-x-2 flex-wrap" role="group" aria-label="结果视图">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            aria-pressed={viewMode === 'tree'}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'tree'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            树形视图
          </button>
          <button
            type="button"
            onClick={() => setViewMode('text')}
            aria-pressed={viewMode === 'text'}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              viewMode === 'text'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {outputMode === 'formatted' ? '格式化文本' : '压缩文本'}
          </button>
        </div>
        
        {viewMode === 'tree' && (
          <div className="flex space-x-2 flex-wrap">
            <button
              type="button"
              onClick={expandAll}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              展开全部
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              折叠全部
            </button>
          </div>
        )}
      </div>

      {/* JSON显示区域 */}
      <div className="relative">
        {viewMode === 'tree' && parsedJson ? (
          <div className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-auto max-h-96 font-mono text-sm">
            <JsonNode
              value={parsedJson}
              level={0}
              path="root"
              collapsedPaths={collapsedPaths}
              onToggleCollapse={toggleCollapse}
            />
          </div>
        ) : (
          <pre className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-auto max-h-96 font-mono text-sm">
            <code
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              className="block whitespace-pre"
            />
          </pre>
        )}
        
        {/* 统计信息 */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
          <span>
            字符数: {statsText.length}
          </span>
          <span>
            行数: {statsText.split('\n').length}
          </span>
        </div>
      </div>
    </div>
  )
}
