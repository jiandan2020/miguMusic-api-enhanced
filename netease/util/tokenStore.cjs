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
  getCnIp,
  setCnIp,
  ensureIdentity,
}
