# migu-api-enhanced

![migu-api-enhanced](https://img.shields.io/npm/v/migu-api-enhanced?style=for-the-badge&logo=npm&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fmigu-api-enhanced) ![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/Domdkw/miguMusic-api-enhanced/bun-release.yml?style=for-the-badge&logo=github&link=https%3A%2F%2Fgithub.com%2FDomdkw%2FmiguMusic-api-enhanced%2Factions%2Fworkflows%2Fbun-release.yml)
基于 Hono 框架的咪咕音乐 API 服务，支持多平台部署。受[jsososo/MiguMusicApi](https://github.com/jsososo/MiguMusicApi)和[NeteaseCloudMusicApiEnhanced](https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced)项目启发。

## API 接口

- **搜索** - 歌曲搜索、热门搜索
- **播放地址** - 播放地址接口（v1/v2/h5v2.4）、下载 v1
- **资源** - 获取歌词（lrc/trc）、解密 mrc 歌词、资源信息、歌曲信息
- **用户** - 个人信息、手机号信息
- **登录认证** - SIM 快捷登录、手机验证码登录

更新于 [API 文档](https://domdkw.github.io/miguMusic-api-enhanced/)
测试站点：https://mmae.jsdm.qzz.io/

如果release发布不及时，可以Fork本仓库后去Action手动触发构建，或者自行构建

## 待办清单

- [ ] 实现 ce 请求头
- [ ] js重构的 signVersion:V005 的签名!
- [ ] url v2.4 v3.x
- [x] 下载 v2 接口 (已实现v1)

欢迎大家提交 Pull Request，或在 GitHub 上打开 Issue。或者适量点点 Star，支持一下！🤗

## 快速开始

### 安装依赖

```bash
pnpm install --registry=https://registry.npmmirror.com
```

### 本地开发

```bash
# Node.js 环境
pnpm run dev

# Bun 环境
pnpm run start:bun --watch

# Cloudflare Workers
pnpm run dev:cf

# Deno 环境
pnpm run dev:deno
```

### 构建与类型检查

```bash
# 构建 NPM 包（使用 tsup）
pnpm run build

# 类型检查（SDK/NPM 包）
pnpm run typecheck
```

### 部署

```bash
# Node.js 生产部署（构建 + 启动）记得检查是否>18
pnpm install         # 安装依赖（包括 devDependencies）
pnpm run build:node  # 编译
pnpm start           # 启动
# 以后直接运行 pnpm start 即可，无需重新构建

# Bun 生产环境
pnpm run start:bun
```

### 环境变量

请参考 [deployment.md](/docs/deployment.md) 部署说明。

## 作为 NPM 包使用

本仓库的 `src/export/` 同时被打包为可独立发布的 NPM 包 `migu-api-enhanced`，
支持 ESM + CJS 双格式，并附带 TypeScript 类型声明。

示例代码：https://github.com/Domdkw/MusicFree-migu/blob/master/plugins/index.ts >0.2.4

### 安装

```bash
pnpm add migu-api-enhanced
# 或
npm install migu-api-enhanced
```

虽然前端不支持跨域，但是你仍然可以使用此包的工具函数。推荐使用命名导入来减小体积

**@migu-api-enhanced/utils** `getDeviceId`/`getQuality`/`changeQuality`/`getResourceId`/`decryptMrc`

### 方式一：命名导入

```ts
import { getAlbumInfo, getUrlV2 } from 'migu-api-enhanced';
import { changeQuality } from 'migu-api-enhanced/utils';
import { getMrc } from 'migu-api-enhanced/mrc';
import { loginNP } from 'migu-api-enhanced/login';
import { signNinan } from 'migu-api-enhanced/activity';
const album = await getAlbumInfo('1123');
// or
import * as migu from 'migu-api-enhanced';
const album = await migu.getAlbumInfo('1123');
```
### 方式二：`createClient` 工厂函数 <2.27.1
```ts
import { createClient } from 'migu-api-enhanced';

const migu = createClient();

// 搜索歌曲
const data = await migu.searchSong('周杰伦', 1);
console.log(data);
```

## 免责声明

本项目仅供学习和研究使用，不得用于商业用途。

本项目通过非官方接口获取数据，与咪咕音乐官方无任何关联。使用本项目所产生的一切后果由使用者自行承担，项目作者不承担任何责任。

本项目所涉及的音视频资源版权归咪咕音乐所有，请支持正版音乐。

请勿将本项目用于任何违反法律法规的用途，包括但不限于：
- 商业用途
- 大规模爬取数据
- 侵犯他人权益
- 其他违法行为

使用本项目即表示您已阅读并同意以上声明。
