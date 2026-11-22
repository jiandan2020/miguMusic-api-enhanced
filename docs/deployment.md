# 部署指南

本项目基于 Hono 框架开发，支持多种平台部署。根据你的需求选择合适的部署方式。

## 已知问题

!> [url接口](./api/url.md)需要国内网络，cf worker/deno/netlify 等平台可能请求失败。

## 环境变量配置

在部署前，需要配置环境变量。复制 `.env.example` 为 `.env` 并根据实际情况修改：

```bash
# CORS 允许的源，多个源用逗号分隔
# 示例: ALLOWED_ORIGINS=http://localhost:3000,http://localhost:6200
# 设置为 * 时允许所有源，留空时拒绝所有跨域请求
ALLOWED_ORIGINS=*

# 是否使用数据库存储 URL
# 启用后，/url/h5v2.4 接口会自动保存音乐链接到数据库（需同时开 AUTO_STORE_URL）
# /url/db 查询接口已移除
USE_DATABASE=true
```

### 环境变量说明

| 变量名 | 说明 | 默认值 | 示例  |
| ---- | ---- | ---- | ---- |
| `ALLOWED_ORIGINS` | CORS 允许的源，多个源用逗号分隔。支持 `*` 通配符 | `*`（允许所有） | `http://localhost:3000,https://example.com` |
| `USE_DATABASE` | 是否启用数据库存储 URL 功能 | `false` | `true` 或 `false` |
| `HOME_REDIRECT_URL` | 首页重定向地址 | `https://domdkw.github.io/miguMusic-api-enhanced/` | - |
| `AUTO_STORE_URL` | 自动存储 h5v2.4 URL接口返回值 到数据库 | `false` | - |
| `API_KEY` | API 鉴权密钥。设置后调用接口需带 `Authorization: Bearer <key>` 或 `?key=<key>`，未设置时不鉴权；`/migu`、`/migu/status`、`/migu/version` 始终公开 | 未设置（公开访问） | - |

?> `AUTO_STORE_URL` / `USE_DATABASE` 需要设置 === `true` 才生效。

## pacmtoken 会话保活（登录一次，服务端续期）

登录一次（SIM 快捷登录或手机验证码登录）后，登录态存在 EdgeOne KV 里，
以后调需要 pacmtoken 的接口不用再传 `?pacmtoken=`，服务端自动用存量；
接口返回里带了新的 pacmtoken 时自动写回（上游文档也写明返回的 pacmtoken
字段就是用来拿刷新后的登录凭证的）。目前只有 `/user/info` 与
`/user/info/phone` 会在返回里带新的 pacmtoken 并写回；`/url/v2` 只用
存量 token 做回退，不写回。定时任务每 6 小时验一次，活着就
再调 `/migu/user/info/phone` 主动轮换一次 token（它会在响应 cookie 里
带回新的 pacmtoken；管理页面的“立即刷新”按钮也是调这个接口）。
**不自动重新登录**：pacmtoken 死了就报 `session_dead`，等手动重新登录
一次——实测 ST 换 token 只能换一次，登录时已经换过一次了，存着的 ST
换不到，不再尝试。

需要做的配置：

1. **EdgeOne 控制台**：新建一个 KV 命名空间，绑定到这个边缘函数，
   变量名填 `MIGU_KV`（KV 以裸全局标识符注入，不在环境变量里）。
   没绑定的话，`/migu/passport/refresh` 会返回 `kv_unavailable`，
   接口照常工作，只是每次都要自己传 `?pacmtoken=`。
2. **GitHub 仓库 Secrets**：加 `MIGU_API_KEY`（就是 `API_KEY` 的值），
   给 `.github/workflows/refresh-pacmtoken.yml` 定时任务调刷新接口用。
3. **登录一次**：调 `/login/sim/send?phone=...` 再轮询
   `/login/sim/query?sessionId=...&isNeedPacm=1`（或手机验证码登录），
   成功后登录态自动写进 KV。注意登录时 `isNeedPacm` 要传 `1`，
   否则只拿到 ST token、不存 pacmtoken。

相关接口：

| 接口 | 说明 |
| ---- | ---- |
| `GET /migu/passport/refresh` | 刷新一次会话：返回 `alive`（还活着）、`no_session`（还没登录过）、`session_dead`（pacmtoken 已失效，需手动重新登录）、`kv_unavailable`（KV 未绑定）、`error`（网络问题）。`refreshed` 已保留但目前不可达（ST 换新已移除）。只验活、不换 token。需要 API_KEY 鉴权 |
| `GET /migu/passport/checkToken` | 不传 `pacmtoken` 时验 KV 里存的会话 |
| `GET /migu/user/info/phone` | 返回用户完整手机号、彩铃信息和新的 pacmtoken；调用一次即主动轮换 token（新 token 自动写回 KV）。定时任务与管理页面的“立即刷新”都用它来轮换 |
| `GET /migu/passport/logout` | 退出登录；退出的是存量会话且咪咕确认成功时，清掉 KV 里的登录态 |

## 管理界面

打开 `https://<域名>/miguadmin`，输入 `API_KEY` 进入（页面本身公开，里面的
数据请求都要带 Key 校验后才能看到内容；Key 默认只存在当前标签页的
sessionStorage，关闭即清除，勾“记住 Key”则存在当前浏览器的 localStorage，
下次打开不用再输）。

面板内容：会话状态（可立即刷新、退出登录）、当前用户信息、会员等级
（`userMemberInfos` 与 `userLevelInfo`）、播放测试（搜歌后自选接口
v1 / v2 / h5v2.4 与音质 toneFlag，显示播放链接并可直接试播）、接口状态。
“立即刷新”调 `/migu/user/info/phone` 主动轮换一次 pacmtoken。
页面实现在 `src/adminPage.ts`（单文件 HTML），路由在 `src/app.ts`。

### CORS 配置规则

- 有 `.env` 文件，并且设置 `ALLOWED_ORIGINS`为空：拒绝所有跨域请求
- 无 `.env` 文件，允许所有cors请求
- 设置为 `*`：允许所有跨域请求
- 设置为具体的域名列表：仅允许列表中的源访问
- 多个源用逗号分隔，不支持空格

## Node.js 部署

适合传统服务器部署，稳定可靠。

请留意 hono 框架在 Node.js 下的兼容性，请查看你的 nodejs 版本是否满足>=18.14.1。[Node.Js 适配器](https://hono.dev/docs/getting-started/nodejs)

### 部署步骤

1. **克隆项目**

```bash
git clone https://github.com/Domdkw/miguMusic-api-enhanced.git
cd miguMusic-api-enhanced
```

1. **安装依赖**

```bash
pnpm install
```

1. **配置环境变量**

创建 `.env` 文件并配置环境变量：

```bash
cp .env.example .env
# 编辑 .env 文件，根据实际情况修改配置
```

或在启动时直接设置环境变量：

```bash
# Windows PowerShell
$env:ALLOWED_ORIGINS="https://example.com"
$env:USE_DATABASE="true"
pnpm start

# Linux/macOS
ALLOWED_ORIGINS=https://example.com USE_DATABASE=true pnpm start
```

1. **构建项目**

```bash
pnpm run build:node
```

1. **启动服务**

```bash
pnpm start
```

服务默认在 `http://localhost:6200` 启动。

## Bun 部署（推荐）

Bun 是高性能的 JavaScript 运行时，启动速度更快，资源占用更低。

### 使用已构建的可执行文件

在 [Releases](https://github.com/Domdkw/miguMusic-api-enhanced/releases) 页面下载对应平台的可执行文件：

- Windows x64: `migu-api-server.exe`
- Linux : `migu-api-server-linux` 自行选择架构

**配置环境变量**

Windows PowerShell:

```powershell
# 临时设置环境变量并运行
$env:ALLOWED_ORIGINS="http://localhost:3000,https://example.com"
$env:USE_DATABASE="true"
.\migu-api-server.exe
```

Linux:

```bash
# 临时设置环境变量并运行
ALLOWED_ORIGINS="http://localhost:3000,https://example.com" USE_DATABASE=true ./migu-api-server-linux
```

**使用 .env 文件（推荐）**

将 `.env.example` 复制到可执行文件所在目录，重命名为 `.env`：

```bash
# 重命名
cp .env.example /path/to/executable/dir/.env
# 编辑 .env 文件配置环境变量
./migu-api-server.exe  # Windows
# 或
./migu-api-server-linux  # Linux
```

Bun 会自动读取同目录下的 `.env` 文件。

### 本地开发

```bash
pnpm run dev
```

## 数据库配置

`USE_DATABASE=true`：启用数据库（`/url/db` 查询接口已移除）。

`AUTO_STORE_URL=true`：自动保存音乐链接到数据库

`bun`、`node.js ` 和其他运行时的数据库，存储在 `./sql/url.sqlite.db` 。共用一个数据库文件。

数据库目前只写不读：`/url/h5v2.4` 在 `AUTO_STORE_URL=true` 时把音乐链接保存到数据库；`/url/db` 查询接口已移除。

## 下一步

- [NPM 包使用](npm-package.md) - 在项目中集成
- [API 接口文档](api/search.md) - 查看接口详细说明

