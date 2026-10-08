/**
 * PHP var_dump 解析器
 * 用于解析和格式化PHP var_dump函数的输出
 */

export interface ParsedValue {
  type: 'string' | 'int' | 'float' | 'bool' | 'array' | 'object' | 'null' | 'resource';
  value: any;
  length?: number;
  children?: ParsedValue[];
  className?: string;
  properties?: { [key: string]: ParsedValue };
  isCollapsed?: boolean;
  key?: string | number; // 数组元素的键值
}

export class VarDumpParser {
  private input: string;
  private position: number;

  constructor(input: string) {
    this.input = input.trim();
    this.position = 0;
  }

  /**
   * 解析var_dump输出
   */
  parse(): ParsedValue[] {
    const results: ParsedValue[] = [];
    
    while (this.position < this.input.length) {
      this.skipWhitespace();
      
      if (this.position >= this.input.length) break;
      
      const value = this.parseValue();
      if (value) {
        results.push(value);
      } else {
        // 如果无法解析，跳过当前字符避免无限循环
        this.position++;
      }
    }
    
    return results;
  }

  /**
   * 解析单个值
   */
  private parseValue(): ParsedValue | null {
    this.skipWhitespace();
    
    // 解析字符串 string(length) "value"
    if (this.input.substr(this.position, 6) === 'string') {
      return this.parseString();
    }
    
    // 解析整数 int(value)
    if (this.input.substr(this.position, 3) === 'int') {
      return this.parseInteger();
    }
    
    // 解析浮点数 float(value)
    if (this.input.substr(this.position, 5) === 'float') {
      return this.parseFloat();
    }
    
    // 解析布尔值 bool(true/false)
    if (this.input.substr(this.position, 4) === 'bool') {
      return this.parseBoolean();
    }
    
    // 解析null
    if (this.input.substr(this.position, 4) === 'NULL') {
      return this.parseNull();
    }
    
    // 解析数组 array(length) { ... }
    if (this.input.substr(this.position, 5) === 'array') {
      return this.parseArray();
    }
    
    // 解析对象 object(ClassName)#id (length) { ... }
    if (this.input.substr(this.position, 6) === 'object') {
      return this.parseObject();
    }
    
    // 解析资源 resource(id) of type (type)
    if (this.input.substr(this.position, 8) === 'resource') {
      return this.parseResource();
    }
    
    return null;
  }

  /**
   * 解析字符串 string(length) "value"
   */
  private parseString(): ParsedValue {
    this.position += 6; // 跳过 "string"
    this.skipWhitespace();
    
    // 解析长度
    let length = 0;
    if (this.input[this.position] === '(') {
      this.position++;
      const lengthStr = this.readUntil(')');
      length = parseInt(lengthStr) || 0;
      this.position++; // 跳过结束的括号
    }
    
    this.skipWhitespace();
    
    // 解析字符串值
    let value = '';
    if (this.input[this.position] === '"') {
      this.position++; // 跳过开始的引号
      
      while (this.position < this.input.length && this.input[this.position] !== '"') {
        if (this.input[this.position] === '\\') {
          this.position++;
          if (this.position < this.input.length) {
            value += this.input[this.position];
          }
        } else {
          value += this.input[this.position];
        }
        this.position++;
      }
      
      this.position++; // 跳过结束的引号
    }
    
    return {
      type: 'string',
      value,
      length,
      isCollapsed: false
    };
  }

  /**
   * 解析整数 int(value)
   */
  private parseInteger(): ParsedValue {
    this.position += 3; // 跳过 "int"
    this.skipWhitespace();
    
    let value = 0;
    if (this.input[this.position] === '(') {
      this.position++;
      const valueStr = this.readUntil(')');
      value = parseInt(valueStr) || 0;
      this.position++; // 跳过结束的括号
    }
    
    return {
      type: 'int',
      value,
      isCollapsed: false
    };
  }

  /**
   * 解析浮点数 float(value)
   */
  private parseFloat(): ParsedValue {
    this.position += 5; // 跳过 "float"
    this.skipWhitespace();
    
    let value = 0;
    if (this.input[this.position] === '(') {
      this.position++;
      const valueStr = this.readUntil(')');
      value = parseFloat(valueStr) || 0;
      this.position++; // 跳过结束的括号
    }
    
    return {
      type: 'float',
      value,
      isCollapsed: false
    };
  }

  /**
   * 解析布尔值 bool(true/false)
   */
  private parseBoolean(): ParsedValue {
    this.position += 4; // 跳过 "bool"
    this.skipWhitespace();
    
    let value = false;
    if (this.input[this.position] === '(') {
      this.position++;
      const valueStr = this.readUntil(')');
      value = valueStr === 'true';
      this.position++; // 跳过结束的括号
    }
    
    return {
      type: 'bool',
      value,
      isCollapsed: false
    };
  }

  /**
   * 解析null值
   */
  private parseNull(): ParsedValue {
    this.position += 4; // 跳过 "NULL"
    return {
      type: 'null',
      value: null,
      isCollapsed: false
    };
  }

  /**
   * 解析数组
   */
  private parseArray(): ParsedValue {
    this.position += 5; // 跳过 "array"
    this.skipWhitespace();
    
    // 解析长度
    let length = 0;
    if (this.input[this.position] === '(') {
      this.position++;
      const lengthStr = this.readUntil(')');
      length = parseInt(lengthStr) || 0;
      this.position++; // 跳过结束的括号
    }
    
    this.skipWhitespace();
    
    // 解析数组内容
    const children: ParsedValue[] = [];
    
    if (this.input[this.position] === '{') {
      this.position++; // 跳过开始的大括号
      
      while (this.position < this.input.length && this.input[this.position] !== '}') {
        this.skipWhitespace();
        
        // 解析键
        let key: string | number = '';
        if (this.input[this.position] === '[') {
          this.position++; // 跳过开始的方括号
          if (this.input[this.position] === '"') {
            // 直接解析字符串键，不调用parseString方法
            this.position++; // 跳过开始的引号
            let keyValue = '';
            while (this.position < this.input.length && this.input[this.position] !== '"') {
              if (this.input[this.position] === '\\') {
                this.position++;
                if (this.position < this.input.length) {
                  keyValue += this.input[this.position];
                }
              } else {
                keyValue += this.input[this.position];
              }
              this.position++;
            }
            this.position++; // 跳过结束的引号
            key = keyValue;
          } else if (this.isDigit(this.input[this.position])) {
            key = parseInt(this.readUntil(['"', ']', '=']));
          }
          this.position++; // 跳过结束的方括号
        }
        
        this.skipWhitespace();
        
        // 跳过 "=>"
        if (this.input.substr(this.position, 2) === '=>') {
          this.position += 2;
        }
        
        this.skipWhitespace();
        
        // 解析值
        const value = this.parseValue();
        if (value) {
          children.push({
            ...value,
            key
          });
        }
        
        this.skipWhitespace();
        
        // 跳过逗号
        if (this.input[this.position] === ',') {
          this.position++;
        }
      }
      
      this.position++; // 跳过结束的大括号
    }
    
    return {
      type: 'array',
      value: `Array (${length})`,
      length,
      children,
      isCollapsed: false
    };
  }

  /**
   * 解析对象
   */
  private parseObject(): ParsedValue {
    this.position += 6; // 跳过 "object"
    this.skipWhitespace();
    
    // 解析类名
    let className = '';
    if (this.input[this.position] === '(') {
      this.position++;
      className = this.readUntil(')');
      this.position++; // 跳过结束的括号
    }
    
    this.skipWhitespace();
    
    // 解析长度
    let length = 0;
    if (this.input[this.position] === '(') {
      this.position++;
      const lengthStr = this.readUntil(')');
      length = parseInt(lengthStr) || 0;
      this.position++; // 跳过结束的括号
    }
    
    this.skipWhitespace();
    
    // 解析属性
    const properties: { [key: string]: ParsedValue } = {};
    
    if (this.input[this.position] === '{') {
      this.position++; // 跳过开始的大括号
      
      while (this.position < this.input.length && this.input[this.position] !== '}') {
        this.skipWhitespace();
        
        // 解析属性名
        let propName = '';
        if (this.input[this.position] === '[') {
          this.position++; // 跳过开始的方括号
          if (this.input[this.position] === '"') {
            // 直接解析字符串属性名，不调用parseString方法
            this.position++; // 跳过开始的引号
            let propValue = '';
            while (this.position < this.input.length && this.input[this.position] !== '"') {
              if (this.input[this.position] === '\\') {
                this.position++;
                if (this.position < this.input.length) {
                  propValue += this.input[this.position];
                }
              } else {
                propValue += this.input[this.position];
              }
              this.position++;
            }
            this.position++; // 跳过结束的引号
            propName = propValue;
          } else if (this.input[this.position] === "'") {
            this.position++;
            propName = this.readUntil("'");
            this.position++;
          }
          this.position++; // 跳过结束的方括号
        }
        
        this.skipWhitespace();
        
        // 跳过 "=>"
        if (this.input.substr(this.position, 2) === '=>') {
          this.position += 2;
        }
        
        this.skipWhitespace();
        
        // 解析属性值
        const value = this.parseValue();
        if (value) {
          properties[propName] = value;
        }
        
        this.skipWhitespace();
        
        // 跳过逗号
        if (this.input[this.position] === ',') {
          this.position++;
        }
      }
      
      this.position++; // 跳过结束的大括号
    }
    
    return {
      type: 'object',
      value: `${className} Object (${length})`,
      className,
      length,
      properties,
      isCollapsed: false
    };
  }

  /**
   * 解析资源
   */
  private parseResource(): ParsedValue {
    this.position += 8; // 跳过 "resource"
    this.skipWhitespace();
    
    // 解析资源ID
    let resourceId = '';
    if (this.input[this.position] === '(') {
      this.position++;
      resourceId = this.readUntil(')');
      this.position++; // 跳过结束的括号
    }
    
    return {
      type: 'resource',
      value: `Resource id #${resourceId}`,
      isCollapsed: false
    };
  }

  /**
   * 跳过空白字符
   */
  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      this.position++;
    }
  }

  /**
   * 读取直到指定字符
   */
  private readUntil(stopChars: string | string[]): string {
    const stops = Array.isArray(stopChars) ? stopChars : [stopChars];
    let result = '';
    
    while (this.position < this.input.length && !stops.includes(this.input[this.position])) {
      result += this.input[this.position];
      this.position++;
    }
    
    return result;
  }

  /**
   * 检查字符是否为数字
   */
  private isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }
}

/**
 * 格式化var_dump输出（异步版本）
 */
export async function formatVarDump(input: string): Promise<ParsedValue[]> {
  return new Promise((resolve, reject) => {
    // 使用 requestIdleCallback 或 setTimeout 来避免阻塞主线程
    const scheduleWork = (callback: () => void) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(callback, { timeout: 100 });
      } else {
        setTimeout(callback, 0);
      }
    };

    scheduleWork(() => {
      try {
        const parser = new VarDumpParser(input);
        const result = parser.parse();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * 格式化var_dump输出（同步版本，用于小数据量）
 */
export function formatVarDumpSync(input: string): ParsedValue[] {
  const parser = new VarDumpParser(input);
  return parser.parse();
}
