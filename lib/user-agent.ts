/**
 * 浏览器 / 操作系统 / 设备类型识别（基于 navigator.userAgent，纯本地解析）
 */

export type DeviceType = '桌面' | '移动' | '平板'

export interface UserAgentInfo {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  deviceType: DeviceType
}

function versionFrom(match: RegExpMatchArray | null): string {
  return match && match[1] ? match[1] : ''
}

/** 浏览器识别，注意 Edge / Opera 先于 Chrome 判断 */
function parseBrowser(ua: string): { name: string; version: string } {
  if (/Edg(?:e|A|iOS)?\/(\d+(?:\.\d+)*)/.test(ua)) {
    return { name: 'Edge', version: versionFrom(ua.match(/Edg(?:e|A|iOS)?\/(\d+(?:\.\d+)*)/)) }
  }
  if (/OPiOS\/(\d+(?:\.\d+)*)/.test(ua)) {
    return { name: 'Opera', version: versionFrom(ua.match(/OPiOS\/(\d+(?:\.\d+)*)/)) }
  }
  if (/OPR\/(\d+(?:\.\d+)*)/.test(ua)) {
    return { name: 'Opera', version: versionFrom(ua.match(/OPR\/(\d+(?:\.\d+)*)/)) }
  }
  if (/Opera[/ ](?:.*Version\/)?(\d+(?:\.\d+)*)/.test(ua)) {
    return { name: 'Opera', version: versionFrom(ua.match(/Version\/(\d+(?:\.\d+)*)/)) }
  }
  if (/Firefox\/(\d+(?:\.\d+)*)/.test(ua)) {
    return { name: 'Firefox', version: versionFrom(ua.match(/Firefox\/(\d+(?:\.\d+)*)/)) }
  }
  if (/Chrome\/(\d+(?:\.\d+)*)/.test(ua)) {
    return { name: 'Chrome', version: versionFrom(ua.match(/Chrome\/(\d+(?:\.\d+)*)/)) }
  }
  if (/Version\/(\d+(?:\.\d+)*).*Safari\//.test(ua)) {
    return { name: 'Safari', version: versionFrom(ua.match(/Version\/(\d+(?:\.\d+)*)/)) }
  }
  if (/MSIE (\d+(?:\.\d+)*)/.test(ua)) {
    return { name: 'Internet Explorer', version: versionFrom(ua.match(/MSIE (\d+(?:\.\d+)*)/)) }
  }
  if (/Trident\/.*rv:(\d+(?:\.\d+)*)/.test(ua)) {
    return {
      name: 'Internet Explorer',
      version: versionFrom(ua.match(/Trident\/.*rv:(\d+(?:\.\d+)*)/)),
    }
  }
  return { name: '未知浏览器', version: '' }
}

function parseOs(ua: string): { name: string; version: string } {
  const ios = ua.match(/OS (\d+)[._](\d+)(?:[._](\d+))?/)
  if (/iPhone|iPad|iPod/.test(ua) && ios) {
    const version = [ios[1], ios[2], ios[3]].filter((part) => part !== undefined).join('.')
    return { name: 'iOS', version }
  }

  const android = ua.match(/Android (\d+(?:\.\d+)?)/)
  if (android) {
    return { name: 'Android', version: android[1] }
  }

  if (/Windows NT 10\.0/.test(ua)) {
    return { name: 'Windows', version: '10 / 11' }
  }
  if (/Windows NT 6\.3/.test(ua)) return { name: 'Windows', version: '8.1' }
  if (/Windows NT 6\.2/.test(ua)) return { name: 'Windows', version: '8' }
  if (/Windows NT 6\.1/.test(ua)) return { name: 'Windows', version: '7' }
  if (/Windows NT 6\.0/.test(ua)) return { name: 'Windows', version: 'Vista' }
  if (/Windows NT 5\.1/.test(ua)) return { name: 'Windows', version: 'XP' }
  if (/Windows/.test(ua)) return { name: 'Windows', version: '' }

  const mac = ua.match(/Mac OS X (\d+)[._](\d+)(?:[._](\d+))?/)
  if (mac) {
    const version = [mac[1], mac[2], mac[3]].filter((part) => part !== undefined).join('.')
    return { name: 'macOS', version }
  }

  if (/CrOS/.test(ua)) return { name: 'Chrome OS', version: '' }
  if (/Linux/.test(ua)) return { name: 'Linux', version: '' }

  return { name: '未知系统', version: '' }
}

function parseDeviceType(ua: string): DeviceType {
  if (/iPad|Tablet|PlayBook|Silk|Kindle/.test(ua)) return '平板'
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return '平板'
  if (/Mobi|iPhone|iPod|Windows Phone|BlackBerry|Opera Mini/.test(ua)) return '移动'
  return '桌面'
}

export function parseUserAgent(userAgent: string): UserAgentInfo {
  const browser = parseBrowser(userAgent)
  const os = parseOs(userAgent)
  return {
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    deviceType: parseDeviceType(userAgent),
  }
}
