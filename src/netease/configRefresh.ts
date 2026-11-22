// 网易云配置按需刷新（EdgeOne 边缘函数版）
//
// 原版 generateConfig.js 在启动时跑一次：调 register_anonimous 拿匿名
// token（MUSIC_A），调 getXeapiPublicKey 拿 xeapi 公钥，都写 os.tmpdir()。
// 边缘函数没有启动时、没有文件系统，改成请求时按需取：
//   - xeapi 公钥：没有就现拉（register_xeapikey，自己发 fetch，不走
//     createRequest，无递归），写 tokenStore（内存 + NETEASE_KV）。
//   - 匿名 token：没有就现拉（register_anonimous，走 createRequest 的
//     xeapi 分支——所以必须先拉好公钥），从返回 cookie 取 MUSIC_A，写
//     tokenStore。
// 两处都用 in-flight 锁防并发重复拉取；ensureConfig 是 best-effort
// （拉取失败只记日志不抛），让不需要该配置的接口照常跑，需要的接口
// 再报明确的缺失错误（request.cjs 的 xeapi 分支会抛）。
// 注意：本文件在 src/netease/（Hono 层），不被 request.cjs 引用，
// 避免与 request.cjs ↔ tokenStore 形成循环依赖。
// @ts-ignore — netease util 是 CommonJS（.cjs），无类型声明
import { getAnonymousToken, setAnonymousToken, getXeapiPublicKey, setXeapiPublicKey, getDeviceId, getCnIp } from '../../netease/util/tokenStore.cjs'
// @ts-ignore — 同上
import { getXeapiPublicKey as fetchXeapiPublicKey } from '../../netease/util/xeapiKey.cjs'
// @ts-ignore — 同上
import { cookieToJson } from '../../netease/util/index.cjs'
// @ts-ignore — 同上
import createRequest from '../../netease/util/request.cjs'
// @ts-ignore — 同上
import registerAnonimous from '../../netease/module/register_anonimous.cjs'

// 给 register_anonimous 用的 request 包装：注入随机中国 IP
//（与 src/netease/router.ts 的 requestWrapper 同一做法）
function requestWithIp(...params: any[]) {
  const obj = [...params]
  const options = obj[2] || {}
  obj[2] = { ...options, ip: getCnIp() }
  return (createRequest as any)(...obj)
}

let xeapiKeyPromise: Promise<any> | null = null
let anonTokenPromise: Promise<string> | null = null
// 拉取失败后的冷却时间：失败后 5 分钟内不再重试，避免每次请求都去调
// 注册/取公钥接口（网易会对频繁注册限流，越重试越拿不到）。
const RETRY_COOLDOWN_MS = 5 * 60 * 1000
let xeapiKeyFailedAt = 0
let anonTokenFailedAt = 0

// 确保有 xeapi 公钥（内存/KV 有就直接返回，没有就现拉并写回）
export async function ensureXeapiKey(): Promise<any> {
  const existing = await getXeapiPublicKey()
  if (existing) return existing
  if (Date.now() - xeapiKeyFailedAt < RETRY_COOLDOWN_MS) {
    throw new Error('xeapi public key refresh cooling down')
  }
  if (!xeapiKeyPromise) {
    xeapiKeyPromise = (async () => {
      const deviceId = await getDeviceId()
      const key = await fetchXeapiPublicKey({}, deviceId)
      await setXeapiPublicKey(key)
      return key
    })()
    // 完成后清锁（成功或失败都清，失败时记下时间、冷却后可重试）
    xeapiKeyPromise.then(
      () => {
        xeapiKeyPromise = null
      },
      () => {
        xeapiKeyPromise = null
        xeapiKeyFailedAt = Date.now()
      },
    )
  }
  return xeapiKeyPromise
}

// 确保有匿名 token（内存/KV 有就直接返回，没有就现拉并写回）
export async function ensureAnonymousToken(): Promise<string> {
  const existing = await getAnonymousToken()
  if (existing) return existing
  if (Date.now() - anonTokenFailedAt < RETRY_COOLDOWN_MS) {
    throw new Error('anonymous token refresh cooling down')
  }
  if (!anonTokenPromise) {
    anonTokenPromise = (async () => {
      // register_anonimous 走 createRequest 的 xeapi 分支，需先有公钥；
      // ensureConfig 里先调 ensureXeapiKey() 保证顺序。
      const result = await registerAnonimous({}, requestWithIp)
      const cookieStr = Array.isArray(result.cookie)
        ? result.cookie.join(';')
        : ''
      const cookieObj = cookieToJson(cookieStr)
      const token = cookieObj.MUSIC_A || ''
      if (!token) throw new Error('anonymous token missing MUSIC_A')
      await setAnonymousToken(token)
      return token
    })()
    anonTokenPromise.then(
      () => {
        anonTokenPromise = null
      },
      () => {
        anonTokenPromise = null
        anonTokenFailedAt = Date.now()
      },
    )
  }
  return anonTokenPromise
}

// 按需刷新全部配置：先公钥，再匿名 token；失败不抛（best-effort）
export async function ensureConfig(): Promise<void> {
  try {
    await ensureXeapiKey()
  } catch (e) {
    console.error('[netease config] xeapi 公钥拉取失败', e)
  }
  try {
    await ensureAnonymousToken()
  } catch (e) {
    console.error('[netease config] 匿名 token 拉取失败', e)
  }
}
