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
import { ensureIdentity, getCnIp } from '../../netease/util/tokenStore.cjs'
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
    const cookie = hasCookie(bodyCookie)
      ? bodyCookie
      : hasCookie(queryCookie)
        ? queryCookie
        : headerCookie
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
