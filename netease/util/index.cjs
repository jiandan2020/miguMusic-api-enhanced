// 工具函数（EdgeOne 边缘函数版）
//
// 原版在 require 时用 fs 读 data/china_ip_ranges.txt（4147 条 CIDR）来生成
// 随机中国 IP；边缘函数没有 fs，改用原来的兜底逻辑（随机 116.x 段，
// 同属中国联通号段，仅用作 X-Real-IP / X-Forwarded-For 请求头提示，
// 不影响接口正确性）。其余函数与原版一致，全部纯 JS。
const logger = require('./logger.cjs')

const floor = Math.floor
const random = Math.random
const keys = Object.keys
const encode = encodeURIComponent

function getRandomInt(min, max) {
  return floor(random() * (max - min + 1)) + min
}
function generateIPSegment() {
  return getRandomInt(1, 255)
}

module.exports = {
  toBoolean(val) {
    if (typeof val === 'boolean') return val
    if (val === '') return val
    return val === 'true' || val == '1'
  },

  cookieToJson(cookie) {
    if (!cookie) return {}
    let cookieArr = cookie.split(';')
    let obj = {}
    for (let i = 0, len = cookieArr.length; i < len; i++) {
      let item = cookieArr[i]
      let separator = item.indexOf('=')
      if (separator > 0) {
        obj[item.slice(0, separator).trim()] = item.slice(separator + 1).trim()
      }
    }
    return obj
  },

  hasCookie(cookie) {
    if (typeof cookie === 'string') return cookie.length > 0
    return (
      cookie !== null &&
      typeof cookie === 'object' &&
      Object.keys(cookie).length > 0
    )
  },

  getCookieHeader(headers) {
    if (!headers || typeof headers !== 'object') return ''

    if (typeof headers.get === 'function') {
      const cookie = headers.get('cookie')
      if (typeof cookie === 'string') return cookie
    }

    const headerName = Object.keys(headers).find(
      (name) => name.toLowerCase() === 'cookie',
    )
    if (!headerName) return ''

    const cookie = headers[headerName]
    if (Array.isArray(cookie)) return cookie.join('; ')
    return typeof cookie === 'string' ? cookie : ''
  },

  cookieObjToString(cookie) {
    const cookieKeys = keys(cookie)
    const result = []
    for (let i = 0, len = cookieKeys.length; i < len; i++) {
      const key = cookieKeys[i]
      result[i] = `${encode(key)}=${encode(cookie[key])}`
    }
    return result.join('; ')
  },

  getRandom(num) {
    var randomValue = random()
    var floorValue = floor(randomValue * 9 + 1)
    var powValue = Math.pow(10, num - 1)
    var randomNum = floor((randomValue + floorValue) * powValue)
    return randomNum
  },

  generateRandomChineseIP() {
    // 边缘版：直接用原版的兜底逻辑（随机 116.x），不读 IP 段文件。
    const fallback = `116.${getRandomInt(25, 94)}.${generateIPSegment()}.${generateIPSegment()}`
    return fallback
  },

  generateChainId(cookie) {
    const version = 'v1'
    const randomNum = Math.floor(Math.random() * 1e6)
    const deviceId =
      getCookieValue(cookie, 'sDeviceId') || 'unknown-' + randomNum
    const platform = 'web'
    const action = 'login'
    const timestamp = Date.now()

    return `${version}_${deviceId}_${platform}_${action}_${timestamp}`
  },

  generateDeviceId() {
    const hexChars = '0123456789ABCDEF'
    const chars = []
    for (let i = 0; i < 52; i++) {
      const randomIndex = Math.floor(Math.random() * hexChars.length)
      chars.push(hexChars[randomIndex])
    }
    return chars.join('')
  },
}

function getCookieValue(cookieStr, name) {
  if (!cookieStr) return ''

  if (typeof cookieStr === 'object') return cookieStr[name] || ''

  const cookies = '; ' + cookieStr
  const parts = cookies.split('; ' + name + '=')
  if (parts.length === 2) return parts.pop().split(';').shift()
  return ''
}
