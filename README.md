# miguMusic-api-enhanced

咪咕 + 网易云音乐 API，二合一，部署在 EdgeOne 上。

- 咪咕 API：`/migu`（v2.28.1，Hono）
- 网易云 API：`/netease`（v4.41.1，Hono，源码来自 [NeteaseCloudMusicApiEnhanced/api-enhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)）

本仓库是 [Domdkw/miguMusic-api-enhanced](https://github.com/Domdkw/miguMusic-api-enhanced) 的 Fork，按 EdgeOne 边缘运行时做了改造，并把网易云合了进来。只保留了在用的接口，其余已删除。

## 接口（仅保留的部分）

### 咪咕 `/migu`（24 个）

- 搜索：`/search`、`/search/hot`
- 取链：`/url/v1`、`/url/v2`、`/url/h5v2.4`、`/url/dlv1`
- 用户：`/user/info`、`/user/info/phone`
- 登录与会话（共 8 个）：`/login/phone/authn`、`/login/phone/msgCode`、`/login/sim/query`、`/login/sim/send`、`/passport/checkToken`、`/passport/getPacmToken`、`/passport/logout`、`/passport/refresh`
- 状态：`/migu/status`、`/version`
- 资源：`/lyric`、`/mrc`、`/resourceinfo`、`/songinfo/contentId`、`/songinfo/songId`、`/songinfo/songId/simple`

### 网易云 `/netease`（19 个）

- 搜索：`/search`、`/search/hot`、`/search/hot/detail`
- 取链：`/song/url`、`/song/url/v1`、`/song/download/url`
- 用户：`/user/account`、`/user/detail`、`/user/level`
- 登录：`/login/cellphone`、`/login/qr/key`、`/login/qr/create`、`/login/qr/check`、`/login/refresh`、`/login/status`、`/logout`
- 歌词：`/lyric`
- 歌曲信息：`/song/detail`
- 状态：`/netease/status`

不在上面清单里的接口一律 404。

## 鉴权

咪咕与网易云共用同一个 `API_KEY`（EdgeOne 控制台的环境变量）。除公开路径外，所有接口都要带 Key：

```
Authorization: Bearer <API_KEY>
```

或

```
?key=<API_KEY>
```

公开路径（不用 Key）：`/migu`、`/migu/status`、`/migu/version`、`/netease`、`/netease/status`、`/netease/version`。

## 登录态与保活

- **咪咕 pacmtoken**：存在 EdgeOne KV（绑定变量名 `MIGU_KV`，键 `pacm_session`）。定时任务每 6 小时验活并轮换（`/migu/passport/refresh` + `/migu/user/info/phone`）。token 死了不会自动重新登录，需手动重登。
- **网易云登录态**：登录走接口，扫码（`/login/qr/key` → `/login/qr/create` → `/login/qr/check`）或手机号（`/login/cellphone`）。登录成功后 cookie 自动存进 EdgeOne KV（绑定变量名 `NETEASE_KV`，键 `netease_user_cookie`），请求没带 cookie 时自动注入；退出登录时清除。

## 部署（EdgeOne）

构建命令必须是：

```bash
pnpm run build:edgeone
```

不要用 `pnpm run build`。构建产物 `functions/[[default]].js` 是生成文件，不要提交。

### 环境变量（EdgeOne 控制台）

| 变量 | 说明 |
| --- | --- |
| `API_KEY` | 鉴权密钥，咪咕与网易云共用 |
| `MIGU_KV` | KV 命名空间绑定，存咪咕 pacmtoken 会话 |
| `NETEASE_KV` | KV 命名空间绑定，存网易云登录态 |
| `ALLOWED_ORIGINS` | 跨域白名单（不配则为 `*`） |

`USE_DATABASE` 请保持关闭（EdgeOne 上 sqlite 无法持久化）。

## 本地开发

```bash
pnpm install
pnpm run build:edgeone   # 构建边缘函数产物
```

类型检查：

```bash
pnpm exec tsc --noEmit -p tsconfig.json
```

## 已知注意点

- EdgeOne 是 V8 边缘运行时，**没有 `process` 全局**，代码里不要直接读 `process.env`（网易云曾因此全站 404，见 `netease/util/option.cjs` 的 `procEnv` 回退）。
- EdgeOne 的响应体流 chunk 是 `ArrayBuffer`，不是 `Uint8Array`，Hono 的 `etag()` 中间件已删掉。
- 网易云加密已全部重写为纯 JS / Web Crypto（EdgeOne 没有 Node `crypto`）；二维码由 PNG data URL 改为 SVG data URL。
- 打包产物约 1.1MB，仍在 EdgeOne 可接受范围。
- 网易云匿名 token（MUSIC_A）偶尔拉不到（疑似网易限流），best-effort，保留接口不依赖它。

更多细节见 [docs/deployment.md](docs/deployment.md)。

## 免责声明

本项目仅供学习和研究使用，不得用于商业用途。

本项目通过非官方接口获取数据，与咪咕音乐、网易云音乐官方无任何关联。使用本项目所产生的一切后果由使用者自行承担，项目作者不承担任何责任。

本项目所涉及的音视频资源版权归咪咕音乐、网易云音乐所有，请支持正版音乐。

请勿将本项目用于任何违反法律法规的用途，包括但不限于：

- 商业用途
- 大规模爬取数据
- 侵犯他人权益
- 其他违法行为

使用本项目即表示您已阅读并同意以上声明。
