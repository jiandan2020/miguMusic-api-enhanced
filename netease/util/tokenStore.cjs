// 网易云登录态存取（EdgeOne 边缘函数版）
//
// 原版把 anonymous_token / xeapi_public_key / neapi_key 存在 os.tmpdir()，
// require 时同步读文件；边缘函数没有文件系统，改存两层：
//   1. 内存（单 isolate 内缓存，命中后不再读 KV，避免每次请求都读 KV）；
//   2. EdgeOne KV（绑定变量名 NETEASE_KV，裸全局标识符注入，typeof 守卫，
//      照咪咕 pacmSession.ts 的写法；未绑定时只用内存，重启后需重新拉取）。
// KV 键只允许字母数字下划线。
// 注意：这里只做存取，不做网络拉取（拉取在 generateConfig 里，见 src/netease/），
// 避免 request.cjs 与拉取逻辑循环依赖。
const KV_BINDING_NAME = 'NETEASE_KV'
const KEY_ANON_TOKEN = 'netease_anon_token'
const KEY_XEAPI_PUBLIC_KEY = 'netease_xeapi_public_key'
const KEY_DEVICE_ID = 'netease_device_id'
const KEY_USER_COOKIE = 'netease_user_cookie'
const KEY_USER_COOKIE_UPDATED_AT = 'netease_user_cookie_updated_at'

function getKvBinding() {
  const kv = globalThis[KV_BINDING_NAME]
  if (!kv || typeof kv.get !== 'function' || typeof kv.put !== 'function') {
    return null
  }
  return kv
}

function isKvAvailable() {
  return getKvBinding() !== null
}

// ---- 内存缓存（isolate 内） ----
let anonTokenMem = null // string | null（null = 未加载过）
let xeapiPublicKeyMem = null // object | null
let deviceIdMem = null // string | null
let cnIpMem = null // string | null
let userCookieMem = null // string | null（null = 未加载过；用户登录会话，只存 name=value 对）
let userCookieUpdatedAtMem = null // string | null（null = 未加载过；会话上次写入时间，ISO 字符串）

async function kvGet(key) {
  const kv = getKvBinding()
  if (!kv) return null
  try {
    return await kv.get(key)
  } catch {
    return null
  }
}
async function kvPut(key, value) {
  const kv = getKvBinding()
  if (!kv) return false
  try {
    await kv.put(key, value)
    return true
  } catch {
    return false
  }
}

async function getAnonymousToken() {
  if (anonTokenMem !== null) return anonTokenMem
  const stored = await kvGet(KEY_ANON_TOKEN)
  anonTokenMem = stored || ''
  return anonTokenMem
}
async function setAnonymousToken(token) {
  anonTokenMem = token || ''
  await kvPut(KEY_ANON_TOKEN, anonTokenMem)
  return anonTokenMem
}

async function getXeapiPublicKey() {
  if (xeapiPublicKeyMem !== null) return xeapiPublicKeyMem
  const stored = await kvGet(KEY_XEAPI_PUBLIC_KEY)
  if (!stored) {
    xeapiPublicKeyMem = null
    return null
  }
  try {
    xeapiPublicKeyMem = JSON.parse(stored)
  } catch {
    xeapiPublicKeyMem = null
  }
  return xeapiPublicKeyMem
}
async function setXeapiPublicKey(keyObj) {
  xeapiPublicKeyMem = keyObj || null
  if (keyObj) {
    await kvPut(KEY_XEAPI_PUBLIC_KEY, JSON.stringify(keyObj))
  }
  return xeapiPublicKeyMem
}

async function getDeviceId() {
  if (deviceIdMem) return deviceIdMem
  const stored = await kvGet(KEY_DEVICE_ID)
  deviceIdMem = stored || ''
  return deviceIdMem
}
async function setDeviceId(id) {
  deviceIdMem = id || ''
  if (deviceIdMem) await kvPut(KEY_DEVICE_ID, deviceIdMem)
  return deviceIdMem
}

// 用户登录会话 cookie（MUSIC_U 等，只存 name=value 对，不存属性）。
// 登录成功（扫码/手机号/刷新）时由路由存入；请求没带 cookie 时由路由
// 取出来注入。KV 未绑定时只用内存，isolate 切换后失效，需重新登录。
async function getUserCookie() {
  // 用户会话每次都直接读 KV（不走内存缓存）：内存里的 cookie 可能已过期，
  // 但 isolate 还攥着它不放，导致管理页一直显示匿名、取链全被网易限到
  // 128k，而 curl（打到另一台节点）却能看到真实账号。KV 是唯一的
  // 事实来源，读一次的代价远小于会话取不到的代价。
  const stored = await kvGet(KEY_USER_COOKIE)
  userCookieMem = stored || ''
  return userCookieMem
}
async function setUserCookie(cookie) {
  userCookieMem = cookie || ''
  await kvPut(KEY_USER_COOKIE, userCookieMem)
  // 顺手记一次写入时间（另存一个 KV 键，不动原 cookie 的格式，老会话不受影响）；
  // 清掉会话（传空串）时也记时间，方便管理页区分“刚退出”与“从未登录”。
  userCookieUpdatedAtMem = new Date().toISOString()
  await kvPut(KEY_USER_COOKIE_UPDATED_AT, userCookieUpdatedAtMem)
  return userCookieMem
}
async function getUserCookieUpdatedAt() {
  if (userCookieUpdatedAtMem !== null) return userCookieUpdatedAtMem
  const stored = await kvGet(KEY_USER_COOKIE_UPDATED_AT)
  userCookieUpdatedAtMem = stored || ''
  return userCookieUpdatedAtMem
}
// 从存着的 cookie 字符串里取出 MUSIC_U 的值（管理页脱敏展示用）
function getMusicUToken() {
  const cookie = userCookieMem || ''
  const m = cookie.match(/(?:^|;\s*)MUSIC_U=([^;]*)/)
  return m ? m[1] : ''
}

function getCnIp() {
  return cnIpMem || ''
}
function setCnIp(ip) {
  cnIpMem = ip || ''
  return cnIpMem
}

// 边缘身份懒初始化：deviceId 与随机中国 IP 各生成一次，写进 globalThis
//（供模块与 request.cjs 的 processCookieObject 读取），deviceId 同时存 KV。
// 只在第一次调用时生成，之后直接返回缓存值。
let identityPromise = null
async function ensureIdentity() {
  if (identityPromise) return identityPromise
  identityPromise = (async () => {
    const { generateDeviceId, generateRandomChineseIP } = require('./index.cjs')
    if (!cnIpMem) {
      cnIpMem = generateRandomChineseIP()
    }
    globalThis.cnIp = cnIpMem
    let deviceId = await getDeviceId()
    if (!deviceId) {
      deviceId = generateDeviceId()
      await setDeviceId(deviceId)
    }
    globalThis.deviceId = deviceId
    return { deviceId, cnIp: cnIpMem }
  })()
  return identityPromise
}

module.exports = {
  isKvAvailable,
  getAnonymousToken,
  setAnonymousToken,
  getXeapiPublicKey,
  setXeapiPublicKey,
  getDeviceId,
  setDeviceId,
  getUserCookie,
  setUserCookie,
  getUserCookieUpdatedAt,
  getMusicUToken,
  getCnIp,
  setCnIp,
  ensureIdentity,
}
