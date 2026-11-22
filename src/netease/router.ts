// 网易云 Hono 路由层（EdgeOne 边缘函数版）
//
// 原版 server.js 是 Express：启动时 fs.readdir 扫 module/ 注册路由，
// 每条路由的 handler 负责拼 query、调模块、回写 Set-Cookie。
// 这里改成 Hono 子应用：路由来自构建时生成的清单（src/netease/routes.ts），
// handler 逻辑与原版一一对应（query 合并、cookie 优先级、request 包装注入 IP、
// 模块返回/抛出的 answer 处理、Set-Cookie 回写）。
// 文件上传（req.files）在边缘函数上不走这套（上传类模块已在清单里排除）。
import { Hono } from 'hono'
import type { Context } from 'hono'
// @ts-ignore — netease util 是 CommonJS（.cjs），无类型声明；esbuild 打包时解析
import createRequest from '../../netease/util/request.cjs'
// @ts-ignore — 同上
import { cookieToJson, hasCookie } from '../../netease/util/index.cjs'
// @ts-ignore — 同上
import { ensureIdentity, getCnIp, getUserCookie, setUserCookie } from '../../netease/util/tokenStore.cjs'
import { ensureConfig } from './configRefresh'
import { neteaseRoutes } from './routes'

const neteaseApp = new Hono()

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

// 从请求头取客户端 IP（边缘函数上没有 Express 的 req.ip）
function getClientIp(c: Context): string {
  const xff = c.req.header('x-forwarded-for') || ''
  if (xff) return xff.split(',')[0].trim()
  return (
    c.req.header('x-real-ip') ||
    c.req.header('cf-connecting-ip') ||
    ''
  )
}

// 解析请求体：JSON 走 json()，表单走 parseBody()，无体则为空对象
async function parseBody(c: Context): Promise<Record<string, any>> {
  const contentType = c.req.header('content-type') || ''
  try {
    if (contentType.includes('application/json')) {
      const j = await c.req.json()
      return j && typeof j === 'object' ? j : {}
    }
    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await c.req.parseBody()
      const out: Record<string, any> = {}
      for (const [k, v] of Object.entries(form)) {
        // 文件对象在边缘上传路径上不处理（上传类模块已排除），只留字符串字段
        if (typeof v === 'string') out[k] = v
      }
      return out
    }
  } catch {
    // 体解析失败按空处理（GET、无体、体格式不对都走这里）
  }
  return {}
}

function appendCookies(res: Response, cookies: unknown): Response {
  if (!Array.isArray(cookies)) return res
  for (const ck of cookies) {
    if (typeof ck === 'string' && ck) res.headers.append('Set-Cookie', ck)
  }
  return res
}

// 从 Set-Cookie 数组里只取 name=value，丢掉 Max-Age/Expires/Path 等属性，
// 拼成可直接当 Cookie 请求头用的字符串。
function extractCookiePairs(cookies: unknown): string {
  if (!Array.isArray(cookies)) return ''
  const pairs: string[] = []
  for (const ck of cookies) {
    if (typeof ck !== 'string') continue
    const first = ck.split(';')[0].trim()
    if (first && first.includes('=')) pairs.push(first)
  }
  return pairs.join('; ')
}

// cookie 对象里有没有非空的 MUSIC_U（网易登录会话）
function hasMusicU(cookie: unknown): boolean {
  return (
    !!cookie &&
    typeof cookie === 'object' &&
    typeof (cookie as any).MUSIC_U === 'string' &&
    (cookie as any).MUSIC_U.length > 0
  )
}

// 把 cookie 对象序列化回 name=value; name=value
function serializeCookieObj(cookie: unknown): string {
  if (!cookie || typeof cookie !== 'object') return ''
  const pairs: string[] = []
  for (const [k, v] of Object.entries(cookie as Record<string, unknown>)) {
    if (typeof v === 'string' && v) pairs.push(k + '=' + v)
  }
  return pairs.join('; ')
}

for (const { route, module: moduleFn } of neteaseRoutes) {
  neteaseApp.all(route, async (c) => {
    // 边缘身份懒初始化（deviceId 与随机中国 IP，第一次请求时生成）
    await ensureIdentity()
    // 配置按需刷新（xeapi 公钥 + 匿名 token，没有就现拉；best-effort，
    // 失败不抛，不影响不需要该配置的接口）
    await ensureConfig()
    const cnIp = getCnIp()
    const clientIp = getClientIp(c)

    const queryParams = c.req.query()
    const bodyObj = await parseBody(c)
    const headerCookie = cookieToJson(c.req.header('Cookie') || '')

    // 与原版 server.js 一致：query / body 里的 cookie 字符串先解码成对象
    for (const item of [queryParams, bodyObj]) {
      if (item && typeof (item as any).cookie === 'string') {
        ;(item as any).cookie = cookieToJson(safeDecode((item as any).cookie))
      }
    }
    const queryCookie = (queryParams as any).cookie
    const bodyCookie = (bodyObj as any).cookie
    let cookie: any = hasCookie(bodyCookie)
      ? bodyCookie
      : hasCookie(queryCookie)
        ? queryCookie
        : headerCookie
    // 请求没带 cookie 时，用存着的用户登录态（扫码/手机号登录后存进 KV）
    if (!hasCookie(cookie)) {
      const stored = await getUserCookie()
      if (stored) cookie = cookieToJson(stored)
    }
    // 请求带了有效的登录 cookie（MUSIC_U）时顺手存下来：首次用上、换号
    // 都覆盖；这样登录过的会话不用再扫码也能被后续请求认出来。
    if (hasMusicU(cookie)) {
      const pairs = serializeCookieObj(cookie)
      const stored = await getUserCookie()
      if (pairs && pairs !== stored) await setUserCookie(pairs)
    }
    const query = Object.assign({}, queryParams, bodyObj, { cookie })

    // request 包装：与原版一致，注入 IP（randomCNIP 时用随机中国 IP，
    // 否则用客户端 IP，取不到时回退随机中国 IP）
    const requestWrapper = (...params: any[]) => {
      const obj = [...params]
      const options = obj[2] || {}
      let ip = ''
      if (options.randomCNIP) {
        ip = cnIp
      } else {
        ip = clientIp || cnIp
      }
      obj[2] = { ...options, ip }
      return (createRequest as any)(...obj)
    }

    try {
      const moduleResponse = await moduleFn(query, requestWrapper)
      const cookies = moduleResponse.cookie
      // 登录成功时把服务端发回的会话 cookie 存进 KV：扫码成功 code 803，
      // 手机号登录/刷新成功 code 200；进行中的扫码（801/802）不带有效
      // MUSIC_U，不会误存。
      if (Array.isArray(cookies) && cookies.length) {
        const pairs = extractCookiePairs(cookies)
        const bodyCode = (moduleResponse.body as any)?.code
        if (
          pairs.includes('MUSIC_U=') &&
          (bodyCode === 803 || bodyCode === 200)
        ) {
          const stored = await getUserCookie()
          if (pairs !== stored) await setUserCookie(pairs)
        }
      }
      // 退出登录成功时清掉存着的会话，避免之后又把已失效的 cookie 注回去
      if (route === '/logout') {
        const bodyCode = (moduleResponse.body as any)?.code
        if (bodyCode === 200) await setUserCookie('')
      }
      if (moduleResponse.redirectUrl) {
        return c.redirect(
          moduleResponse.redirectUrl,
          moduleResponse.status || 302,
        )
      }
      const res = c.json(
        moduleResponse.body,
        moduleResponse.status as any,
      )
      if (!query.noCookie) {
        appendCookies(res, cookies)
      }
      return res
    } catch (moduleResponse: any) {
      if (!moduleResponse.body) {
        return c.json({ code: 404, data: null, msg: 'Not Found' }, 404)
      }
      if (moduleResponse.body.code == '301')
        moduleResponse.body.msg = '需要登录'
      const res = c.json(
        moduleResponse.body,
        moduleResponse.status as any,
      )
      if (!query.noCookie) {
        appendCookies(res, moduleResponse.cookie)
      }
      return res
    }
  })
}

export default neteaseApp
