'use client'

import React, { useState } from 'react'
import { ParsedValue } from '@/lib/var-dump/varDumpParser'

interface VarDumpRendererProps {
  data: ParsedValue[]
  level?: number
}

/**
 * var_dump渲染器组件
 * 用于渲染解析后的var_dump数据
 */
export default function VarDumpRenderer({ data, level = 0 }: VarDumpRendererProps) {
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())

  /**
   * 切换折叠状态
   */
  const toggleCollapse = (path: string) => {
    const newCollapsed = new Set(collapsedItems)
    if (newCollapsed.has(path)) {
      newCollapsed.delete(path)
    } else {
      newCollapsed.add(path)
    }
    setCollapsedItems(newCollapsed)
  }

  /**
   * 渲染单个值
   */
  const renderValue = (item: ParsedValue, path: string = '', index: number = 0): React.ReactNode => {
    const currentPath = path ? `${path}.${index}` : `${index}`
    const isCollapsed = collapsedItems.has(currentPath)
    const indent = level * 20

    switch (item.type) {
      case 'string':
        return (
          <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
            <span className="syntax-type">string</span>
            <span className="mx-2 text-php-gray">({item.length})</span>
            <span className="syntax-string">"{item.value}"</span>
          </div>
        )

      case 'int':
      case 'float':
        return (
          <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
            <span className="syntax-type">{item.type}</span>
            <span className="mx-2 text-php-gray">({item.value})</span>
            <span className="syntax-number">{item.value}</span>
          </div>
        )

      case 'bool':
        return (
          <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
            <span className="syntax-type">bool</span>
            <span className="mx-2 text-php-gray">({item.value ? 'true' : 'false'})</span>
            <span className={`${item.value ? 'text-php-green' : 'text-php-red'}`}>
              {item.value ? 'true' : 'false'}
            </span>
          </div>
        )

      case 'null':
        return (
          <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
            <span className="syntax-type">NULL</span>
          </div>
        )

      case 'array':
        return (
          <div style={{ marginLeft: `${indent}px` }}>
            <div className="flex items-center">
              <button
                onClick={() => toggleCollapse(currentPath)}
                className="toggle-btn mr-2"
                aria-label={isCollapsed ? '展开' : '折叠'}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
              <span className="syntax-type">array</span>
              <span className="mx-2 text-php-gray">({item.length})</span>
              <span className="syntax-keyword">{item.value}</span>
            </div>
            {!isCollapsed && item.children && (
              <div className="mt-1">
                {item.children.map((child, childIndex) => (
                  <div key={childIndex} className="flex items-start">
                    <span className="text-php-yellow mr-2" style={{ marginLeft: `${indent + 20}px` }}>
                      [{child.key !== undefined ? child.key : childIndex}]
                    </span>
                    <div className="flex-1">
                      {renderValue(child, currentPath, childIndex)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'object':
        return (
          <div style={{ marginLeft: `${indent}px` }}>
            <div className="flex items-center">
              <button
                onClick={() => toggleCollapse(currentPath)}
                className="toggle-btn mr-2"
                aria-label={isCollapsed ? '展开' : '折叠'}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
              <span className="syntax-type">object</span>
              <span className="mx-2 text-php-gray">({item.className})</span>
              <span className="syntax-keyword">{item.value}</span>
            </div>
            {!isCollapsed && item.properties && (
              <div className="mt-1">
                {Object.entries(item.properties).map(([key, value], propIndex) => (
                  <div key={key} className="flex items-start">
                    <span className="text-php-yellow mr-2" style={{ marginLeft: `${indent + 20}px` }}>
                      [{key}]
                    </span>
                    <div className="flex-1">
                      {renderValue(value, currentPath, propIndex)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      case 'resource':
        return (
          <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
            <span className="syntax-type">resource</span>
            <span className="mx-2 text-php-gray">(resource)</span>
            <span className="syntax-comment">{item.value}</span>
          </div>
        )

      default:
        return (
          <div className="flex items-center" style={{ marginLeft: `${indent}px` }}>
            <span className="text-php-gray">未知类型: {JSON.stringify(item)}</span>
          </div>
        )
    }
  }

  return (
    <div className="code-block">
      {data.map((item, index) => (
        <div key={index}>
          {renderValue(item, '', index)}
        </div>
      ))}
    </div>
  )
}
