// 生成网易云 Hono 路由清单。
//
// 用法：node scripts/generate-netease-routes.mjs
// 读 netease/module/*.cjs，按原版 server.js 的规则映射路由（文件名 `_` 转 `/`，
// 如 song_url.cjs -> /song/url），只注册 KEEP 白名单里的模块，生成
// src/netease/routes.ts（带 // @ts-nocheck，静态 import 全部模块，
// esbuild 打包时解析）。生成后要重新跑 tsc 与打包验证。
//
// 精简（第 4 步，2026-11-22，用户确认保留 19 个接口）：
// 只保留 KEEP 里的 18 个路由模块（/netease/status 不走模块，在 app.ts 里
// 直接返回）；其余模块文件已从 netease/module/ 删掉。
// register_anonimous / register_xeapikey 是内部支撑模块（configRefresh 用
// 它们拉匿名 token 与 xeapi 公钥），文件保留但不注册为路由。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const moduleDir = path.join(repoRoot, 'netease', 'module')
const outFile = path.join(repoRoot, 'src', 'netease', 'routes.ts')

// 保留清单（2026-11-22 用户确认，19 个接口；/netease/status 不走模块）。
// 键是模块文件名，值是挂到 /netease 之后的全路径。
const KEEP = new Map([
  // 搜索
  ['search.cjs', '/netease/search'],
  ['search_hot.cjs', '/netease/search/hot'],
  ['search_hot_detail.cjs', '/netease/search/hot/detail'],
  // 取链
  ['song_url.cjs', '/netease/song/url'],
  ['song_url_v1.cjs', '/netease/song/url/v1'],
  ['song_download_url.cjs', '/netease/song/download/url'],
  // 用户
  ['user_account.cjs', '/netease/user/account'],
  ['user_detail.cjs', '/netease/user/detail'],
  ['user_level.cjs', '/netease/user/level'],
  // 登录与会话
  ['login_cellphone.cjs', '/netease/login/cellphone'],
  ['login_qr_key.cjs', '/netease/login/qr/key'],
  ['login_qr_create.cjs', '/netease/login/qr/create'],
  ['login_qr_check.cjs', '/netease/login/qr/check'],
  ['login_refresh.cjs', '/netease/login/refresh'],
  ['login_status.cjs', '/netease/login/status'],
  ['logout.cjs', '/netease/logout'],
  // 歌词
  ['lyric.cjs', '/netease/lyric'],
  // 歌曲信息
  ['song_detail.cjs', '/netease/song/detail'],
])

// 内部支撑模块（文件保留，不注册为路由）
const INTERNAL = new Map([
  ['register_anonimous.cjs', '内部：configRefresh 拉匿名 token（MUSIC_A）'],
  ['register_xeapikey.cjs', '内部：configRefresh 拉 xeapi 公钥'],
])

// 原版 server.js 的 special 映射（文件名即路由，不按 `_` 转 `/`）
// 精简后保留清单里没有这三个，留作参考。
const SPECIAL = {
  'daily_signin.cjs': '/daily_signin',
  'fm_trash.cjs': '/fm_trash',
  'personal_fm.cjs': '/personal_fm',
}

function routeOf(file) {
  if (KEEP.has(file)) return KEEP.get(file).replace(/^\/netease/, '')
  if (SPECIAL[file]) return SPECIAL[file]
  return '/' + file.replace(/\.cjs$/, '').replace(/_/g, '/')
}

function identOf(file) {
  // 文件名转合法标识符：search -> mod_search；song_url -> mod_song_url
  return 'mod_' + file.replace(/\.cjs$/, '').replace(/[^a-zA-Z0-9_]/g, '_')
}

const files = fs
  .readdirSync(moduleDir)
  .filter((f) => f.endsWith('.cjs'))
  .sort()

const included = []
const excluded = []
for (const file of files) {
  if (KEEP.has(file)) {
    included.push({ file, route: routeOf(file), ident: identOf(file) })
  } else if (INTERNAL.has(file)) {
    excluded.push({ file, reason: INTERNAL.get(file) })
  } else {
    excluded.push({ file, reason: '不在保留清单（第 4 步精简）' })
  }
}

// 校验：KEEP 里的文件必须都在目录里（缺了说明误删）
for (const file of KEEP.keys()) {
  if (!files.includes(file)) {
    console.error('MISSING kept module: ' + file)
    process.exit(1)
  }
}

const lines = []
lines.push('// @ts-nocheck')
lines.push('// 自动生成：node scripts/generate-netease-routes.mjs（不要手改）。')
lines.push('// 来源：netease/module/*.cjs（enhanced fork v4.41.1），按原版 server.js')
lines.push('// 的规则映射路由；只注册 KEEP 白名单里的 18 个模块（19 个保留接口')
lines.push('// 里 /netease/status 不走模块，在 app.ts 里直接返回）。')
lines.push('')
for (const m of included) {
  lines.push(`import ${m.ident} from '../../netease/module/${m.file}';`)
}
lines.push('')
lines.push('export interface NeteaseModule {')
lines.push('  (query: any, request: any): Promise<any>;')
lines.push('}')
lines.push('')
lines.push('export const neteaseRoutes: Array<{ route: string; module: NeteaseModule }> = [')
for (const m of included) {
  lines.push(`  { route: '${m.route}', module: ${m.ident} },`)
}
lines.push('];')
lines.push('')
lines.push('export const neteaseExcluded: Array<{ file: string; reason: string }> = [')
for (const e of excluded) {
  lines.push(`  { file: '${e.file}', reason: '${e.reason.replace(/'/g, "\\'")}' },`)
}
lines.push('];')
lines.push('')

fs.writeFileSync(outFile, lines.join('\n'))
console.log(`routes: ${included.length} included, ${excluded.length} excluded -> ${path.relative(repoRoot, outFile)}`)
for (const e of excluded) console.log(`  excluded: ${e.file} (${e.reason})`)
