// 对外 HTTP 层（EdgeOne 边缘函数版）
//
// 原版用 axios + Node http/https Agent + 代理（pac-proxy-agent / tunnel）；
// 边缘函数是 V8 运行时、没有这些模块，全部改用原生 fetch：
// - 加密：./crypto.cjs（纯 JS / Web Crypto，见该文件头）
// - 匿名 token / xeapi 公钥：./tokenStore.cjs（内存 + NETEASE_KV），
//   require 时不再读 os.tmpdir() 的文件，改为每次请求前异步取
// - 反作弊 token（checkToken v2/v3）：原版用 jsdom 跑易盾 SDK，边缘无法运行，
//   已移除；带 checkToken 的请求不再带 X-antiCheatToken（大多数公开接口不需要）
// - 代理：移除（options.proxy 直接忽略）
// - 超时：AbortController + setTimeout（EdgeOne 没有 AbortSignal.timeout）
// - 响应解密：e_r / xeapi / neapi 与原版一致；neapi 仍会明确抛错（见 crypto.cjs）
// - 不用 Buffer：响应体用 Uint8Array / 文本处理
//
// 对外接口与原版一致：module.exports = createRequest(uri, data, options)，
// 返回 Promise<{ status, body, cookie }>，失败时 reject 同样的结构。
const encrypt = require('./crypto.cjs')
const CryptoJS = require('crypto-js')
const logger = require('./logger.cjs')
const {
  cookieToJson,
  cookieObjToString,
  getCookieHeader,
  hasCookie,
  toBoolean,
  generateRandomChineseIP,
} = require('./index.cjs')
const { APP_CONF } = require('./config.json')
const {
  getAnonymousToken,
  getXeapiPublicKey,
} = require('./tokenStore.cjs')
const { loadNeapiKey } = require('./neapiKey.cjs')

const floor = Math.floor
const random = Math.random
const now = Date.now
const keys = Object.keys
const stringify = JSON.stringify
const parse = JSON.parse
const characters = 'abcdefghijklmnopqrstuvwxyz'
const charactersLength = characters.length

// 预先计算 WNMCID（只计算一次）
const WNMCID = (function () {
  let randomString = ''
  for (let i = 0; i < 6; i++) {
    randomString += characters.charAt(floor(random() * charactersLength))
  }
  return `${randomString}.${now().toString()}.01.0`
})()

let NMTID = ''
let NMTID_RETRIES_LEFT = 3

let neapiUserStatus = ''

const osMap = {
  pc: {
    os: 'pc',
    appver: '3.1.17.204416',
    osver: 'Microsoft-Windows-10-Professional-build-19045-64bit',
    channel: 'netease',
  },
  linux: {
    os: 'linux',
    appver: '1.2.1.0428',
    osver: 'Deepin 20.9',
    channel: 'netease',
  },
  android: {
    os: 'android',
    appver: '8.20.20.231215173437',
    osver: '14',
    channel: 'xiaomi',
  },
  iphone: {
    os: 'iPhone OS',
    appver: '9.0.90',
    osver: '16.2',
    channel: 'distribution',
  },
  osx: {
    os: 'osx',
    appver: '3.1.10.5100',
    osver: '15.5',
    channel: 'netease',
  },
}

const userAgentMap = {
  weapi: {
    pc: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  },
  linuxapi: {
    linux:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
  },
  api: {
    pc: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/3.1.29.205117',
    android:
      'NeteaseMusic/9.5.61.260802021928(9005061);Dalvik/2.1.0 (Linux; U; Android 12; HBN-AL00 Build/cd737a2.0)',
    iphone: 'NeteaseMusic 9.0.90/5038 (iPhone; iOS 16.2; zh_CN)',
  },
}

const DOMAIN = APP_CONF.domain
const API_DOMAIN = APP_CONF.apiDomain
const EAPI_DOMAIN = APP_CONF.eapiDomain
const XEAPI_DOMAIN = APP_CONF.xeapiDomain
const NEAPI_DOMAIN = APP_CONF.neapiDomain
const ENCRYPT_RESPONSE = APP_CONF.encryptResponse
const SPECIAL_STATUS_CODES = new Set([201, 302, 400, 502, 800, 801, 802, 803])

let xeapiSessionId = ''
let xeapiSessionKey = ''

const chooseUserAgent = (crypto, uaType = 'pc') => {
  return (userAgentMap[crypto] && userAgentMap[crypto][uaType]) || ''
}

const processCookieObject = (cookie, crypto, anonymousToken) => {
  const _ntes_nuid = CryptoJS.lib.WordArray.random(32).toString()
  const os = osMap[cookie.os] || osMap['pc']

  const processedCookie = {
    ...cookie,
    __remember_me: 'true',
    ntes_kaola_ad: '1',
    _ntes_nuid: cookie._ntes_nuid || _ntes_nuid,
    _ntes_nnid: cookie._ntes_nnid || `${_ntes_nuid},${now().toString()}`,
    WNMCID: cookie.WNMCID || WNMCID,
    WEVNSM: cookie.WEVNSM || '1.0.0',
    osver: cookie.osver || os.osver,
    deviceId: cookie.deviceId || globalThis.deviceId,
    os: cookie.os || os.os,
    channel: cookie.channel || os.channel,
    appver: cookie.appver || os.appver,
  }

  if (cookie.NMTID) {
    processedCookie['NMTID'] = cookie.NMTID
  } else if (NMTID) {
    processedCookie['NMTID'] = NMTID
  } else if (NMTID_RETRIES_LEFT <= 0 || crypto !== 'eapi') {
    processedCookie['NMTID'] =
      '00O' + CryptoJS.lib.WordArray.random(19).toString()
  }

  if (!processedCookie.MUSIC_U) {
    processedCookie.MUSIC_A = processedCookie.MUSIC_A || anonymousToken
  }

  return processedCookie
}

const createHeaderCookie = (header) => {
  const headerKeys = keys(header)
  const cookieParts = new Array(headerKeys.length)

  for (let i = 0, len = headerKeys.length; i < len; i++) {
    const key = headerKeys[i]
    cookieParts[i] =
      encodeURIComponent(key) + '=' + encodeURIComponent(header[key])
  }

  return cookieParts.join('; ')
}

const generateRequestId = () => {
  return `${now()}_${floor(random() * 1000)
    .toString()
    .padStart(4, '0')}`
}

function bytesToHexUpper(b) {
  let s = ''
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0')
  return s.toUpperCase()
}

function getSetCookie(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    try {
      return res.headers.getSetCookie()
    } catch {
      return []
    }
  }
  const sc = res.headers.get('set-cookie')
  return sc ? [sc] : []
}

const createRequest = async (uri, data, options) => {
  // 反作弊 token（checkToken v2/v3）：原版用 jsdom 跑易盾 SDK，边缘无法运行。
  // 这里直接跳过（不带 X-antiCheatToken）；大多数公开接口不需要它。
  const headers = options.headers ? { ...options.headers } : {}
  const ip = options.realIP || options.ip || ''

  let crypto = options.crypto
  if (crypto === '') {
    crypto = APP_CONF.encrypt ? 'eapi' : 'api'
  }

  if (ip) {
    headers['X-Real-IP'] = ip
    headers['X-Forwarded-For'] = ip
  }

  let cookie = hasCookie(options.cookie)
    ? options.cookie
    : getCookieHeader(options.headers)
  if (!hasCookie(cookie)) cookie = {}
  if (typeof cookie === 'string') {
    cookie = cookieToJson(cookie)
  }

  // 匿名 token 改为异步取（内存 -> NETEASE_KV -> ''）；取不到时按空处理，
  // 多数公开接口仍可返回数据（服务端会按匿名处理）。
  const anonymousToken = await getAnonymousToken()
  if (typeof cookie === 'object') {
    cookie = processCookieObject(cookie, crypto, anonymousToken)
    Object.keys(headers).forEach((name) => {
      if (name.toLowerCase() === 'cookie') delete headers[name]
    })
    headers['Cookie'] = cookieObjToString(cookie)
  }
  let url = ''
  let encryptData = ''
  const csrfToken = cookie['__csrf'] || ''

  const answer = { status: 500, body: {}, cookie: [] }

  data.e_r = toBoolean(
    options.e_r !== undefined
      ? options.e_r
      : data.e_r !== undefined
        ? data.e_r
        : ENCRYPT_RESPONSE,
  )

  switch (crypto) {
    case 'weapi':
      headers['Referer'] = options.domain || DOMAIN
      headers['User-Agent'] = options.ua || chooseUserAgent('weapi')
      data.csrf_token = csrfToken
      encryptData = encrypt.weapi(data)
      url = (options.domain || DOMAIN) + '/weapi/' + uri.substr(5)
      break

    case 'linuxapi':
      headers['User-Agent'] =
        options.ua || chooseUserAgent('linuxapi', 'linux')
      encryptData = encrypt.linuxapi({
        method: 'POST',
        url: (options.domain || DOMAIN) + uri,
        params: data,
      })
      url = (options.domain || DOMAIN) + '/api/linux/forward'
      break

    case 'xeapi': {
      const xeapiPublicKey = await getXeapiPublicKey()
      if (!xeapiPublicKey) {
        throw new Error('xeapi public key is missing')
      }
      const xeapiOs = cookie.os === 'android' ? cookie.os : 'android'
      const xeapiAppver =
        cookie.os === 'android' && cookie.appver ? cookie.appver : '9.1.65'
      const xeapiOsver =
        cookie.os === 'android' && cookie.osver ? cookie.osver : '16'
      const xeapiBuildver = cookie.buildver || now().toString().substr(0, 10)
      headers['User-Agent'] = options.ua || chooseUserAgent('api', 'android')
      headers['X-Client-Enc-State'] = 'ENCRYPTED'
      headers['x-aeapi'] = true
      headers['content-type'] =
        'application/x-www-form-urlencoded;charset=utf-8'
      headers['x-deviceid'] = cookie.deviceId
      headers['x-os'] = xeapiOs
      headers['x-osver'] = xeapiOsver
      headers['x-appver'] = xeapiAppver
      headers['x-sdeviceid'] = cookie.sDeviceId || cookie.deviceId
      headers['x-buildver'] = xeapiBuildver
      if (cookie.MUSIC_U) headers['x-music-u'] = cookie.MUSIC_U
      const xeapiCookie = {
        ...cookie,
        os: xeapiOs,
        osver: xeapiOsver,
        appver: xeapiAppver,
        buildver: xeapiBuildver,
        deviceId: cookie.deviceId,
        sDeviceId: cookie.sDeviceId || cookie.deviceId,
      }
      headers['Cookie'] = cookieObjToString(xeapiCookie)
      url = (options.domain || XEAPI_DOMAIN) + '/xeapi/' + uri.substr(5)
      encryptData = await encrypt.xeapi(uri, data, {
        ...options,
        publicKeyState: xeapiPublicKey,
        sessionId: xeapiSessionId,
        sessionKey: xeapiSessionKey,
        appver: xeapiAppver,
        deviceId: cookie.deviceId,
        os: xeapiOs,
        uid: cookie.uid || cookie.userId || '',
      })
      break
    }

    case 'neapi': {
      const neapiKey = loadNeapiKey()
      if (!neapiKey) {
        throw new Error('neapi config is missing')
      }
      const neapiCookie = {
        osver: cookie.osver,
        deviceId: cookie.deviceId,
        os: cookie.os,
        appver: cookie.appver,
        versioncode: cookie.versioncode || '140',
        mobilename: cookie.mobilename || '',
        buildver: cookie.buildver || now().toString().substr(0, 10),
        resolution: cookie.resolution || '1920x1080',
        __csrf: csrfToken,
        channel: cookie.channel,
        requestId: generateRequestId(),
      }
      if (cookie.MUSIC_U) neapiCookie['MUSIC_U'] = cookie.MUSIC_U
      if (cookie.MUSIC_A) neapiCookie['MUSIC_A'] = cookie.MUSIC_A
      headers['Cookie'] = createHeaderCookie(neapiCookie)
      headers['User-Agent'] = options.ua || chooseUserAgent('api', 'android')
      headers['content-type'] =
        'application/x-www-form-urlencoded;charset=utf-8'
      headers['X-ER'] = String(neapiKey.version)
      if (neapiUserStatus) headers['X-USER-STATUS'] = neapiUserStatus

      const neapiBody = { ...data }
      delete neapiBody.e_r
      encryptData = encrypt.neapi(
        new URLSearchParams(neapiBody).toString(),
        neapiKey,
      )
      url = (options.domain || NEAPI_DOMAIN) + '/neapi/' + uri.substr(5)
      break
    }

    case 'eapi':
    case 'api': {
      const header = {
        osver: cookie.osver,
        deviceId: cookie.deviceId,
        os: cookie.os,
        appver: cookie.appver,
        versioncode: cookie.versioncode || '140',
        mobilename: cookie.mobilename || '',
        buildver: cookie.buildver || now().toString().substr(0, 10),
        resolution: cookie.resolution || '1920x1080',
        __csrf: csrfToken,
        channel: cookie.channel,
        requestId: generateRequestId(),
      }

      if (cookie.MUSIC_U) header['MUSIC_U'] = cookie.MUSIC_U
      if (cookie.MUSIC_A) header['MUSIC_A'] = cookie.MUSIC_A
      if (crypto === 'eapi' && cookie.NMTID) header['NMTID'] = cookie.NMTID

      headers['Cookie'] = createHeaderCookie(header)
      headers['User-Agent'] =
        options.ua ||
        (cookie.os === 'osx'
          ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          : chooseUserAgent('api', 'iphone'))

      if (crypto === 'eapi') {
        data.header = header
        encryptData = encrypt.eapi(uri, data)
        url = (options.domain || EAPI_DOMAIN) + '/eapi/' + uri.substr(5)
      } else if (crypto === 'api') {
        url = (options.domain || API_DOMAIN) + uri
        encryptData = data
      }
      break
    }

    default:
      console.log('[ERR]', 'Unknown Crypto:', crypto)
      break
  }

  const use_e_r = (crypto === 'eapi' || crypto === 'weapi') && data.e_r
  const use_xeapi = crypto === 'xeapi'
  const use_neapi = crypto === 'neapi'
  const isEncryptedBody = use_e_r || use_xeapi || use_neapi

  const bodyString =
    crypto === 'neapi'
      ? encryptData
      : new URLSearchParams(encryptData).toString()
  if (!headers['content-type'] && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  // fetch（替代 axios）：超时用 AbortController + setTimeout。
  const controller = new AbortController()
  let timeoutId = null
  if (options.timeout > 0) {
    timeoutId = setTimeout(() => controller.abort(), options.timeout)
  }
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyString,
      signal: controller.signal,
    })
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId)
    answer.status = 502
    answer.body = { code: 502, msg: err.message || String(err) }
    console.log('[ERR]', answer)
    throw answer
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }

  try {
    const setCookies = getSetCookie(res)
    const cleanCookie = (x) => x.replace(/\s*Domain=[^(;|$)]+;*/, '')

    if (
      crypto === 'eapi' &&
      !NMTID &&
      NMTID_RETRIES_LEFT > 0 &&
      !cookie.NMTID
    ) {
      NMTID_RETRIES_LEFT--
      answer.cookie = setCookies.map((x) => {
        const cleaned = cleanCookie(x)
        const match = x.match(/(?:^|;\s*)NMTID=([^;]+)/)
        if (match) {
          NMTID = match[1]
        }
        return cleaned
      })
    } else {
      answer.cookie = setCookies.map(cleanCookie)
    }

    const userStatus = res.headers.get('x-user-status') || ''
    if (use_neapi) {
      neapiUserStatus = userStatus
    }

    let body
    if (isEncryptedBody) {
      body = new Uint8Array(await res.arrayBuffer())
    } else {
      const text = await res.text()
      try {
        body = parse(text)
      } catch {
        body = text
      }
    }

    try {
      if (use_xeapi) {
        if (res.headers.get('x-encr-ssid') && res.headers.get('x-encr-sskey')) {
          xeapiSessionId = res.headers.get('x-encr-ssid')
          xeapiSessionKey = res.headers.get('x-encr-sskey')
        }
        answer.body = encrypt.xeapiResDecrypt(body)
      } else if (use_neapi) {
        // neapi 在 crypto.cjs 里会明确抛错（ChaCha20-Poly1305 无 Web Crypto 实现）
        let b64 = ''
        const bytes = body instanceof Uint8Array ? body : new TextEncoder().encode(String(body))
        for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i])
        answer.body = encrypt.neapiResDecrypt(btoa(b64), loadNeapiKey())
      } else if (use_e_r) {
        answer.body = encrypt.eapiResDecrypt(
          bytesToHexUpper(body),
          headers['x-aeapi'],
        )
      } else {
        answer.body = typeof body === 'object' ? body : parse(String(body))
      }

      if (answer.body && answer.body.code) {
        answer.body.code = Number(answer.body.code)
      }

      answer.status = Number((answer.body && answer.body.code) || res.status)

      if (answer.body && SPECIAL_STATUS_CODES.has(answer.body.code)) {
        answer.status = 200
      }
    } catch (e) {
      answer.body = body
      answer.status = res.status
    }

    answer.status =
      answer.status > 100 && answer.status < 600 ? answer.status : 400

    if (answer.status === 200) {
      return answer
    } else {
      console.log('[ERR]', answer)
      throw answer
    }
  } catch (err) {
    // 已按原版结构 reject 的 answer 直接透传；其余异常包成 502
    if (err && typeof err === 'object' && 'status' in err && 'body' in err) {
      throw err
    }
    answer.status = 502
    answer.body = { code: 502, msg: err.message || String(err) }
    console.log('[ERR]', answer)
    throw answer
  }
}

module.exports = createRequest
