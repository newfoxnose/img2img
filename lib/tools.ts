/**
 * 全站工具注册表
 * 首页、页脚、搜索与最近使用均以此为准，新增工具只需在这里登记一次
 */

export type ToolCategory =
  | '图片处理'
  | '编码转换'
  | '开发调试'
  | '文本处理'
  | '时间日期'
  | '网络工具'

export interface ToolMeta {
  href: string
  icon: string
  title: string
  description: string
  tags: string[]
  category: ToolCategory
  keywords: string[]
  isNew?: boolean
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  '图片处理',
  '编码转换',
  '开发调试',
  '文本处理',
  '时间日期',
  '网络工具',
]

export const tools: ToolMeta[] = [
  {
    href: '/image',
    icon: '🖼️',
    title: '图片处理',
    description:
      '图片格式转换、压缩、证件照制作与图片分割，支持批量处理、ZIP 打包下载和 AI 智能抠图换背景。',
    tags: ['格式转换', '图片压缩', '证件照', '图片分割'],
    category: '图片处理',
    keywords: ['图片转换', 'jpg', 'png', 'webp', '压缩', '证件照', '图片分割'],
  },
  {
    href: '/base64',
    icon: '🔤',
    title: 'Base64 编解码',
    description:
      '文本与文件 Base64 编码/解码，支持 URL-Safe、图片预览，全部在浏览器本地完成。',
    tags: ['编码', '解码', '文件', 'URL-Safe'],
    category: '编码转换',
    keywords: ['base64', '编码', '解码', '图片转base64', '文件编码'],
    isNew: true,
  },
  {
    href: '/urlcodec',
    icon: '🔗',
    title: 'URL 编解码',
    description:
      'URL 编码与解码，自动拆解查询参数为表格，支持组件编码与整段 URL 处理。',
    tags: ['URL', 'URLEncode', '参数解析'],
    category: '编码转换',
    keywords: ['url编码', 'url解码', 'urlencode', 'urldecode', '查询参数'],
    isNew: true,
  },
  {
    href: '/unicode',
    icon: '🅰️',
    title: 'Unicode / UTF-8 转换',
    description:
      '文本与 Unicode 转义序列、UTF-8 字节、HTML 实体互转，适合排查乱码与国际化问题。',
    tags: ['Unicode', 'UTF-8', 'HTML 实体'],
    category: '编码转换',
    keywords: ['unicode', 'utf8', '转义', 'html实体', '乱码'],
    isNew: true,
  },
  {
    href: '/md5',
    icon: '#',
    title: '哈希计算',
    description:
      'MD5、SHA-1、SHA-256、SHA-512 与 HMAC 计算，支持文本批量与文件拖拽哈希，纯浏览器本地处理。',
    tags: ['MD5', 'SHA', 'HMAC', '文件哈希'],
    category: '开发调试',
    keywords: ['md5', 'sha1', 'sha256', 'sha512', 'hmac', '哈希', '文件校验'],
  },
  {
    href: '/jsonformatter',
    icon: '{ }',
    title: 'JSON 格式化',
    description:
      'JSON 格式化、压缩、校验、排序、JSONPath 查询与 YAML/XML/CSV 转换，支持语法高亮与差异对比。',
    tags: ['格式化', '校验', 'JSONPath', '差异对比'],
    category: '开发调试',
    keywords: ['json', '格式化', 'jsonpath', 'yaml', 'xml', 'csv', 'diff'],
  },
  {
    href: '/vardump',
    icon: '🐘',
    title: 'PHP 调试输出美化',
    description:
      'var_dump / print_r / json_encode 输出美化，支持语法高亮、折叠展开与结构化解析。',
    tags: ['PHP', 'var_dump', 'print_r', '调试'],
    category: '开发调试',
    keywords: ['php', 'var_dump', 'print_r', '调试', 'dd', 'dump'],
  },
  {
    href: '/jwt',
    icon: '🔑',
    title: 'JWT 解析',
    description:
      '解析 JWT 的 Header 与 Payload，展示签发/过期时间与过期状态，本地解码不上传。',
    tags: ['JWT', 'Token', '解码'],
    category: '开发调试',
    keywords: ['jwt', 'token', '解码', 'payload', 'bearer'],
    isNew: true,
  },
  {
    href: '/regex',
    icon: '.*',
    title: '正则测试',
    description:
      '实时测试正则表达式，高亮匹配结果与分组，内置常用正则模板与替换预览。',
    tags: ['正则', '匹配', '替换'],
    category: '开发调试',
    keywords: ['正则', 'regex', 'regexp', '匹配', '替换'],
    isNew: true,
  },
  {
    href: '/uuid',
    icon: '🎲',
    title: 'UUID / 随机密码',
    description:
      '批量生成 UUID v4、NanoID 风格随机 ID 与随机密码，可配置长度和字符集。',
    tags: ['UUID', '随机密码', '生成器'],
    category: '开发调试',
    keywords: ['uuid', 'guid', '随机密码', 'nano', '生成器'],
    isNew: true,
  },
  {
    href: '/diff',
    icon: '🧾',
    title: '文本对比',
    description:
      '行级文本/代码差异对比，高亮新增、删除与修改行，支持忽略空白与大小写。',
    tags: ['Diff', '文本对比', '代码对比'],
    category: '文本处理',
    keywords: ['diff', '对比', '文本比较', '代码比较', '差异'],
    isNew: true,
  },
  {
    href: '/markdown',
    icon: '📝',
    title: 'Markdown 预览',
    description:
      'Markdown 实时预览与 HTML 导出，支持表格、代码块、任务列表与常用语法。',
    tags: ['Markdown', '预览', 'HTML'],
    category: '文本处理',
    keywords: ['markdown', 'md', '预览', 'html', '文档'],
    isNew: true,
  },
  {
    href: '/zhconvert',
    icon: '🈶',
    title: '简繁转换',
    description:
      '简体中文与繁体中文互相转换，支持台湾/香港用词与批量文本转换。',
    tags: ['简体', '繁体', '中文'],
    category: '文本处理',
    keywords: ['简繁转换', '繁体', '简体', '中文转换'],
    isNew: true,
  },
  {
    href: '/color',
    icon: '🎨',
    title: '颜色转换',
    description:
      'HEX、RGB、HSL、HSV 颜色互转，提供取色器、色板与亮度对比度提示。',
    tags: ['颜色', 'HEX', 'RGB', 'HSL'],
    category: '图片处理',
    keywords: ['颜色转换', 'hex', 'rgb', 'hsl', '取色器', '色板'],
    isNew: true,
  },
  {
    href: '/qrcode',
    icon: '🔳',
    title: '二维码工具',
    description:
      '在线生成二维码并下载 PNG/SVG，也可上传图片识别二维码内容，本地处理。',
    tags: ['二维码', '生成', '识别'],
    category: '图片处理',
    keywords: ['二维码', 'qrcode', '扫码', '生成二维码', '识别二维码'],
    isNew: true,
  },
  {
    href: '/timestamp',
    icon: '⏱️',
    title: '时间戳转换',
    description:
      'Unix 时间戳与日期互转，批量转换、多时区对照、相对时间与 Cron 表达式解析。',
    tags: ['时间戳', '日期转换', '时区', 'Cron'],
    category: '时间日期',
    keywords: ['时间戳', 'unix', '日期转换', '时区', 'cron'],
  },
  {
    href: '/datecalc',
    icon: '📅',
    title: '日期计算',
    description:
      '计算两个日期的间隔、日期加减天数/月数，并显示星期与常用日期格式。',
    tags: ['日期差', '日期加减', '星期'],
    category: '时间日期',
    keywords: ['日期计算', '日期差', '天数计算', '日期加减'],
    isNew: true,
  },
  {
    href: '/unit',
    icon: '📐',
    title: '单位换算',
    description:
      '长度、面积、重量、温度、数据存储与时间单位换算，支持批量结果对照。',
    tags: ['单位换算', '长度', '重量', '存储'],
    category: '网络工具',
    keywords: ['单位换算', '长度', '重量', '温度', '存储', '流量'],
    isNew: true,
  },
  {
    href: '/ip',
    icon: '🌐',
    title: '本机 IP 查询',
    description:
      '查看本机局域网 IP 与公网 IP，展示归属地、运营商、浏览器与系统信息，一键复制。',
    tags: ['本地IP', '公网IP', '归属地', 'UA'],
    category: '网络工具',
    keywords: ['本机ip', '公网ip', 'ip查询', '归属地', 'ua'],
  },
]

export function getToolByHref(href: string): ToolMeta | undefined {
  return tools.find((tool) => tool.href === href)
}

export function searchTools(keyword: string): ToolMeta[] {
  const query = keyword.trim().toLowerCase()
  if (!query) return tools
  return tools.filter((tool) => {
    const haystack = [
      tool.title,
      tool.description,
      tool.category,
      ...tool.tags,
      ...tool.keywords,
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
}
