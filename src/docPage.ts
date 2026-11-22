/**
 * API 接口文档页 /doc（单文件 HTML，内联 CSS/JS，无外部依赖，无需鉴权）。
 *
 * - 样式跟随一言 /stats 的设计变量：靛蓝主色 #6366F1、浅色背景、
 *   白色圆角卡片、边框 #e2e8f0。
 * - 左侧固定目录（咪咕 / 网易云两组锚点），右侧内容区；顶部过滤框
 *   可按接口名过滤接口卡片与目录链接。
 * - 内容覆盖全部 43 个接口：咪咕 24 个、网易云 19 个。每个接口写明
 *   方法、路径、参数表、返回值要点与示例请求/响应。
 * - 公开仓库注意：文档里不写线上部署域名，示例请求统一用占位符
 *   https://your-domain；管理页 /admin 不在本文档里写地址。
 * - 模板字面量里不要用反引号或 ${}，内联 JS 只用字符串拼接。
 */
export const docPageHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>音乐 API 接口文档</title>
<style>
:root {
  --color-primary: #6366f1;
  --color-primary-hover: #5457e8;
  --color-primary-container: #e0e7ff;
  --color-primary-text: #3730a3;
  --color-background: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-variant: #f1f5f9;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-success: #16a34a;
  --color-error: #dc2626;
  --radius-md: 12px;
  --radius-xl: 20px;
  --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgb(15 23 42 / 0.06);
  --font-sans: -apple-system, "BlinkMacSystemFont", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-sans); background: var(--color-background); color: var(--color-text); }
.page-head { max-width: 1180px; margin: 0 auto; padding: 28px 16px 8px; }
.page-head .eyebrow { margin: 0 0 6px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-text-muted); }
.page-head h1 { margin: 0; font-size: 28px; }
.page-head .intro { margin: 8px 0 0; font-size: 14px; color: var(--color-text-secondary); }
.layout { display: flex; gap: 20px; max-width: 1180px; margin: 0 auto; padding: 12px 16px 48px; align-items: flex-start; }
.sidebar { position: sticky; top: 16px; width: 260px; flex: none; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 16px; max-height: calc(100vh - 32px); overflow: auto; box-shadow: var(--shadow-sm); }
.sidebar h3 { margin: 14px 0 6px; font-size: 14px; }
.sidebar h3:first-child { margin-top: 0; }
.sidebar h4 { margin: 10px 8px 2px; font-size: 12px; color: var(--color-text-muted); font-weight: 600; }
.sidebar a { display: block; padding: 5px 8px; border-radius: 8px; color: var(--color-text); text-decoration: none; }
.sidebar a:hover { background: var(--color-surface-variant); color: var(--color-text); }
.sidebar a .t { display: block; font-size: 13px; line-height: 1.4; }
.sidebar a .p { display: block; font-size: 11px; font-family: var(--font-mono); color: var(--color-text-muted); word-break: break-all; line-height: 1.4; }
.content { flex: 1; min-width: 0; }
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow-sm); }
.card h3 { margin: 0 0 8px; font-size: 17px; }
.card h4 { margin: 16px 0 6px; font-size: 14px; }
.card p { margin: 6px 0; font-size: 14px; line-height: 1.7; color: var(--color-text-secondary); }
.card p code, .card li code { font-family: var(--font-mono); font-size: 12px; background: var(--color-surface-variant); border-radius: 6px; padding: 1px 5px; }
.card ul { margin: 6px 0; padding-left: 20px; font-size: 14px; line-height: 1.7; color: var(--color-text-secondary); }
.section-title { margin: 28px 0 12px; font-size: 20px; border-bottom: 2px solid var(--color-primary); padding-bottom: 6px; }
.method { display: inline-block; background: var(--color-primary-container); color: var(--color-primary-text); font-weight: 700; font-size: 12px; padding: 2px 8px; border-radius: var(--radius-full); vertical-align: middle; }
.path { font-family: var(--font-mono); font-size: 15px; font-weight: 700; word-break: break-all; }
.badge-public { display: inline-block; background: #dcfce7; color: #14532d; font-size: 12px; padding: 2px 8px; border-radius: var(--radius-full); vertical-align: middle; margin-left: 6px; }
table.params { width: 100%; border-collapse: collapse; font-size: 13px; margin: 8px 0; }
table.params th, table.params td { border: 1px solid var(--color-border); padding: 6px 8px; text-align: left; vertical-align: top; }
table.params th { background: var(--color-surface-variant); white-space: nowrap; }
table.params td code { font-family: var(--font-mono); font-size: 12px; }
pre { background: #0f172a; color: #e2e8f0; border-radius: var(--radius-md); padding: 12px; overflow: auto; font-size: 12px; line-height: 1.6; margin: 8px 0 0; }
pre code { font-family: var(--font-mono); }
.menu-toggle { display: none; }
.filter { width: 100%; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); font-size: 14px; margin-bottom: 8px; outline: none; }
.filter:focus { border-color: var(--color-primary); }
.note { background: var(--color-primary-container); border-radius: var(--radius-md); padding: 10px 12px; font-size: 13px; line-height: 1.7; color: var(--color-primary-text); }
@media (max-width: 900px) {
  .layout { flex-direction: column; }
  .menu-toggle { display: block; position: sticky; top: 0; z-index: 10; width: 100%; text-align: left; padding: 12px 14px; font-size: 15px; font-weight: 600; color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer; box-shadow: var(--shadow-sm); }
  .sidebar { display: none; position: static; width: auto; max-height: none; margin-top: 8px; }
  .sidebar.open { display: block; }
}
</style>
</head>
<body>
<div class="page-head">
<p class="eyebrow">Music API &middot; Docs</p>
<h1>音乐 API 接口文档</h1>
<p class="intro">咪咕音乐 + 网易云音乐，二合一接口。全部接口均为 GET。示例里的域名统一用占位符，请换成你自己的部署域名。</p>
</div>
<button id="menuToggle" class="menu-toggle" type="button">☰ 目录</button>
<div class="layout">
<nav class="sidebar">
<input id="filterInput" class="filter" placeholder="按接口名过滤，例如 搜索">
<h3>说明</h3>
<a href="#auth" data-search="auth 鉴权 说明"><span class="t">鉴权说明</span></a>
<h3>咪咕</h3>
<h4>搜索</h4>
<a href="#mg-search" data-search="migu search 搜索 搜索歌曲"><span class="t">搜索歌曲</span><span class="p">/migu/search</span></a>
<a href="#mg-search-hot" data-search="migu search hot 热搜"><span class="t">热搜</span><span class="p">/migu/search/hot</span></a>
<h4>取链</h4>
<a href="#mg-url-v1" data-search="migu url v1 取链 播放链接"><span class="t">播放链接 v1</span><span class="p">/migu/url/v1</span></a>
<a href="#mg-url-v2" data-search="migu url v2 取链 播放链接"><span class="t">播放链接 v2</span><span class="p">/migu/url/v2</span></a>
<a href="#mg-url-h5v24" data-search="migu url h5v2.4 取链 播放链接"><span class="t">播放链接 h5v2.4</span><span class="p">/migu/url/h5v2.4</span></a>
<a href="#mg-url-dlv1" data-search="migu url dlv1 下载 下载链接"><span class="t">下载链接</span><span class="p">/migu/url/dlv1</span></a>
<h4>用户</h4>
<a href="#mg-user-info" data-search="migu user info 用户信息"><span class="t">用户信息</span><span class="p">/migu/user/info</span></a>
<a href="#mg-user-info-phone" data-search="migu user info phone 手机号"><span class="t">手机号信息</span><span class="p">/migu/user/info/phone</span></a>
<h4>登录与会话</h4>
<a href="#mg-login-phone-authn" data-search="migu login phone authn 手机登录"><span class="t">手机登录</span><span class="p">/migu/login/phone/authn</span></a>
<a href="#mg-login-phone-msgcode" data-search="migu login phone msgcode 验证码 发送验证码"><span class="t">发送验证码</span><span class="p">/migu/login/phone/msgCode</span></a>
<a href="#mg-login-sim-query" data-search="migu login sim query 查询 SIM 登录"><span class="t">SIM 登录查询</span><span class="p">/migu/login/sim/query</span></a>
<a href="#mg-login-sim-send" data-search="migu login sim send 发送 SIM 登录"><span class="t">SIM 登录发送</span><span class="p">/migu/login/sim/send</span></a>
<a href="#mg-passport-checktoken" data-search="migu passport checktoken 验活 会话"><span class="t">会话验活</span><span class="p">/migu/passport/checkToken</span></a>
<a href="#mg-passport-getpacmtoken" data-search="migu passport getpacmtoken 换 token pacmtoken"><span class="t">换 pacmtoken</span><span class="p">/migu/passport/getPacmToken</span></a>
<a href="#mg-passport-logout" data-search="migu passport logout 退出"><span class="t">退出登录</span><span class="p">/migu/passport/logout</span></a>
<a href="#mg-passport-refresh" data-search="migu passport refresh 刷新 会话"><span class="t">刷新会话</span><span class="p">/migu/passport/refresh</span></a>
<h4>状态</h4>
<a href="#mg-status" data-search="migu status 状态 服务状态"><span class="t">服务状态</span><span class="p">/migu/status</span></a>
<a href="#mg-version" data-search="migu version 版本"><span class="t">版本</span><span class="p">/migu/version</span></a>
<h4>资源</h4>
<a href="#mg-lyric" data-search="migu lyric 歌词"><span class="t">歌词</span><span class="p">/migu/lyric</span></a>
<a href="#mg-mrc" data-search="migu mrc 歌词"><span class="t">MRC 歌词</span><span class="p">/migu/mrc</span></a>
<a href="#mg-resourceinfo" data-search="migu resourceinfo 资源"><span class="t">资源信息</span><span class="p">/migu/resourceinfo</span></a>
<a href="#mg-songinfo-contentid" data-search="migu songinfo contentid 歌曲信息"><span class="t">歌曲信息（contentId）</span><span class="p">/migu/songinfo/contentId</span></a>
<a href="#mg-songinfo-songid" data-search="migu songinfo songid 歌曲信息"><span class="t">歌曲信息（songId）</span><span class="p">/migu/songinfo/songId</span></a>
<a href="#mg-songinfo-songid-simple" data-search="migu songinfo songid simple 歌曲信息 简版"><span class="t">歌曲信息（简版）</span><span class="p">/migu/songinfo/songId/simple</span></a>
<h3>网易云</h3>
<h4>搜索</h4>
<a href="#ne-search" data-search="netease search 搜索"><span class="t">搜索</span><span class="p">/netease/search</span></a>
<a href="#ne-search-hot" data-search="netease search hot 热搜"><span class="t">热搜</span><span class="p">/netease/search/hot</span></a>
<a href="#ne-search-hot-detail" data-search="netease search hot detail 热搜详情"><span class="t">热搜详情</span><span class="p">/netease/search/hot/detail</span></a>
<h4>取链</h4>
<a href="#ne-song-url" data-search="netease song url 取链 v2 播放链接"><span class="t">播放链接</span><span class="p">/netease/song/url</span></a>
<a href="#ne-song-url-v1" data-search="netease song url v1 取链 播放链接"><span class="t">播放链接 v1</span><span class="p">/netease/song/url/v1</span></a>
<a href="#ne-song-download-url" data-search="netease song download url 下载 下载链接"><span class="t">下载链接</span><span class="p">/netease/song/download/url</span></a>
<h4>用户</h4>
<a href="#ne-user-account" data-search="netease user account 账号"><span class="t">账号信息</span><span class="p">/netease/user/account</span></a>
<a href="#ne-user-detail" data-search="netease user detail 用户详情 会员"><span class="t">用户详情</span><span class="p">/netease/user/detail</span></a>
<a href="#ne-user-level" data-search="netease user level 等级"><span class="t">用户等级</span><span class="p">/netease/user/level</span></a>
<h4>登录</h4>
<a href="#ne-login-cellphone" data-search="netease login cellphone 手机号登录"><span class="t">手机号登录</span><span class="p">/netease/login/cellphone</span></a>
<a href="#ne-login-qr-key" data-search="netease login qr key 扫码 key"><span class="t">扫码 key</span><span class="p">/netease/login/qr/key</span></a>
<a href="#ne-login-qr-create" data-search="netease login qr create 扫码 二维码 生成"><span class="t">生成二维码</span><span class="p">/netease/login/qr/create</span></a>
<a href="#ne-login-qr-check" data-search="netease login qr check 扫码 检查 状态"><span class="t">扫码状态</span><span class="p">/netease/login/qr/check</span></a>
<a href="#ne-login-refresh" data-search="netease login refresh 刷新"><span class="t">刷新登录</span><span class="p">/netease/login/refresh</span></a>
<a href="#ne-login-status" data-search="netease login status 登录状态"><span class="t">登录状态</span><span class="p">/netease/login/status</span></a>
<a href="#ne-logout" data-search="netease logout 退出"><span class="t">退出登录</span><span class="p">/netease/logout</span></a>
<h4>歌词与歌曲</h4>
<a href="#ne-lyric" data-search="netease lyric 歌词"><span class="t">歌词</span><span class="p">/netease/lyric</span></a>
<a href="#ne-song-detail" data-search="netease song detail 歌曲详情"><span class="t">歌曲详情</span><span class="p">/netease/song/detail</span></a>
<h4>状态</h4>
<a href="#ne-status" data-search="netease status 状态 服务状态"><span class="t">服务状态</span><span class="p">/netease/status</span></a>
</nav>
<main class="content">
<section class="card" id="auth">
<h3>鉴权说明</h3>
<p>除下面列出的公开路径外，所有接口都要带 API_KEY。两种传法任选其一：</p>
<ul>
<li>请求头：<code>Authorization: Bearer &lt;API_KEY&gt;</code>（推荐）</li>
<li>查询参数：<code>?key=&lt;API_KEY&gt;</code></li>
</ul>
<p>未带 Key 或 Key 错误返回 401：<code>{"success": false, "error": "Unauthorized"}</code>。</p>
<h4>公开路径（无需鉴权）</h4>
<p><code>/migu</code>、<code>/migu/status</code>、<code>/migu/version</code>、<code>/netease</code>、<code>/netease/status</code>、<code>/netease/version</code>、<code>/admin</code>、<code>/doc</code>。</p>
<h4>注意事项</h4>
<ul>
<li>网易云扫码登录的 <code>/login/qr/create</code> 与 <code>/login/qr/check</code> 有个 <code>key</code> 参数是网易的 unikey，与鉴权用的 <code>key</code> 重名：调这两个接口时 API_KEY 必须走 <code>Authorization</code> 请求头，unikey 走 <code>?key=&lt;unikey&gt;</code>，不要把两个 <code>key</code> 都放查询参数里。</li>
<li>咪咕接口返回体一般是 <code>{"success": true, "code": "000000", "info": "...", "data": {...}}</code>；<code>code</code> 为 <code>000000</code> 表示成功，其他值见各接口说明。网易云接口沿用上游格式，一般是 <code>{"code": 200, "data": ...}</code>。</li>
<li>咪咕登录态（pacmtoken）由服务端保管：登录一次后存进 KV，后续请求不用再传 token；网易云登录态（cookie）同理。</li>
</ul>
</section>
<h2 class="section-title">咪咕</h2>
<section class="card ep" id="mg-search" data-search="migu search 搜索">
<h3><span class="method">GET</span> <span class="path">/migu/search</span></h3>
<p>搜索歌曲。返回匹配的歌曲列表，每首歌含 contentId、copyrightId、songId、歌名、歌手、专辑、时长、封面图与各音质档位（audioFormats）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>text</code></td><td>是</td><td>搜索关键词，例如“晴天”</td></tr>
<tr><td><code>page</code></td><td>否</td><td>页码，默认 1；每页 20 条，响应里 <code>hasNext</code> 表示是否还有下一页</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/search?text=晴天&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "hasNext": true,
    "items": [
      {
        "song": {
          "contentId": "600902000006889366",
          "copyrightId": "60054701923",
          "songId": "3790007",
          "songName": "晴天",
          "singerList": [{ "singerName": "周杰伦" }],
          "album": "叶惠美",
          "duration": 269,
          "img1": "/image/70/25/514/1234567.jpg",
          "audioFormats": [
            { "formatType": "PQ", "resourceType": "2", "showTagsNew": ["vip"], "asize": "4.1MB" },
            { "formatType": "HQ", "resourceType": "2", "showTagsNew": ["vip"], "asize": "10.2MB" },
            { "formatType": "SQ", "resourceType": "2", "showTagsNew": ["vip"], "asize": "28.5MB" }
          ]
        }
      }
    ]
  }
}</code></pre>
</section>
<section class="card ep" id="mg-search-hot" data-search="migu search hot 热搜">
<h3><span class="method">GET</span> <span class="path">/migu/search/hot</span></h3>
<p>热搜榜。返回当前热门搜索关键词列表，无需参数。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/search/hot?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "hotwords": ["晴天", "周杰伦", "稻香"]
  }
}</code></pre>
</section>
<section class="card ep" id="mg-url-v1" data-search="migu url v1 取链">
<h3><span class="method">GET</span> <span class="path">/migu/url/v1</span></h3>
<p>取播放链接（v1）。会对返回的链接按 toneFlag 做音质转换。会员歌可能返回 <code>440013</code>（仅 60 秒试听），此时请改走 <code>/migu/url/h5v2.4</code>。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>contentId</code></td><td>是</td><td>歌曲 contentId（搜索接口返回）</td></tr>
<tr><td><code>copyrightId</code></td><td>是</td><td>歌曲 copyrightId（搜索接口返回）</td></tr>
<tr><td><code>toneFlag</code></td><td>否</td><td>音质档位，默认 PQ。见下方音质档位表</td></tr>
<tr><td><code>resourceType</code></td><td>否</td><td>资源类型，默认 2</td></tr>
</table>
<h4>音质档位（toneFlag）</h4>
<table class="params">
<tr><th>档位</th><th>格式</th><th>说明</th></tr>
<tr><td><code>LQ</code></td><td>MP3 64k</td><td>试听</td></tr>
<tr><td><code>PQ</code></td><td>MP3 128k</td><td>默认</td></tr>
<tr><td><code>HQ</code></td><td>MP3 320k</td><td></td></tr>
<tr><td><code>SQ</code></td><td>FLAC</td><td>无损</td></tr>
<tr><td><code>ZQ24</code></td><td>FLAC 24bit</td><td></td></tr>
<tr><td><code>ZQ32</code></td><td>WAV 32bit</td><td></td></tr>
<tr><td><code>Z3D</code></td><td>WAV 3D</td><td>安卓</td></tr>
<tr><td><code>I3D</code></td><td>ALAC 3D</td><td>苹果</td></tr>
<tr><td><code>3D60</code></td><td>WAV 3D</td><td>60 秒试听</td></tr>
</table>
<p>高档位一般需要会员；能否播放取决于咪咕 CDN 有没有该版本的文件。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/url/v1?contentId=600902000006889366&amp;copyrightId=60054701923&amp;toneFlag=PQ&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "url": "https://freetyst.nf.migu.cn/.../600902000006889366.mp3",
    "audioFormatType": "PQ"
  }
}</code></pre>
</section>
<section class="card ep" id="mg-url-v2" data-search="migu url v2 取链">
<h3><span class="method">GET</span> <span class="path">/migu/url/v2</span></h3>
<p>取播放链接（v2）。与 v1 不同：<strong>v2 不做音质转换</strong>，传什么 toneFlag 都原样返回对应链接。会员歌同样可能返回 <code>440013</code>。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>contentId</code></td><td>是</td><td>歌曲 contentId</td></tr>
<tr><td><code>copyrightId</code></td><td>是</td><td>歌曲 copyrightId</td></tr>
<tr><td><code>toneFlag</code></td><td>否</td><td>音质档位，默认 PQ。档位见 <code>/migu/url/v1</code></td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/url/v2?contentId=600902000006889366&amp;copyrightId=60054701923&amp;toneFlag=HQ&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "url": "https://freetyst.nf.migu.cn/.../600902000006889366.mp3",
    "audioFormatType": "HQ"
  }
}</code></pre>
</section>
<section class="card ep" id="mg-url-h5v24" data-search="migu url h5v2.4 取链">
<h3><span class="method">GET</span> <span class="path">/migu/url/h5v2.4</span></h3>
<p>取播放链接（h5v2.4）。<strong>会员歌优先走这个接口</strong>：v1/v2 对白金会员歌只给 60 秒试听（440013）时，h5v2.4 往往能直接拿到可播的 128k MP3。支持音质转换。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>contentId</code></td><td>是</td><td>歌曲 contentId</td></tr>
<tr><td><code>copyrightId</code></td><td>是</td><td>歌曲 copyrightId</td></tr>
<tr><td><code>toneFlag</code></td><td>否</td><td>音质档位，默认 PQ。档位见 <code>/migu/url/v1</code></td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/url/h5v2.4?contentId=600902000006889366&amp;copyrightId=60054701923&amp;toneFlag=PQ&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "url": "https://freetyst.nf.migu.cn/.../600902000006889366.mp3",
    "audioFormatType": "PQ"
  }
}</code></pre>
</section>
<section class="card ep" id="mg-url-dlv1" data-search="migu url dlv1 下载">
<h3><span class="method">GET</span> <span class="path">/migu/url/dlv1</span></h3>
<p>取下载链接（v1）。免费歌曲返回下载地址；收费歌曲返回 <code>200013</code>（收费歌曲需要购买下载），无链接。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>songId</code></td><td>是</td><td>歌曲 songId（搜索接口返回）</td></tr>
<tr><td><code>toneFlag</code></td><td>否</td><td>音质档位，默认 PQ。档位见 <code>/migu/url/v1</code></td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/url/dlv1?songId=3790007&amp;toneFlag=PQ&amp;key=API_KEY"</code></pre>
<h4>示例响应（免费歌曲）</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "url": "https://dlsdownfree.nf.migu.cn/.../3790007.mp3",
    "audioFormatType": "PQ"
  }
}</code></pre>
<p>收费歌曲示例响应：<code>{"success": true, "code": "200013", "info": "收费歌曲需要购买下载"}</code>。</p>
</section>
<section class="card ep" id="mg-user-info" data-search="migu user info 用户信息">
<h3><span class="method">GET</span> <span class="path">/migu/user/info</span></h3>
<p>获取当前用户信息。默认用服务端 KV 里存着的登录态；也可显式传 <code>pacmtoken</code> 覆盖。返回里含会员信息（<code>userMemberInfos</code>）、等级（<code>userLevelInfo</code>）与顶层 <code>pacmtoken</code>（如有新 token 轮换，会自动写回 KV）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>pacmtoken</code></td><td>否</td><td>显式指定 token；不传则用存量会话</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/user/info?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "pacmtoken": "ST01...",
  "userInfoItem": {
    "userId": "b6091ed5-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "nickName": "小周从此逝",
    "userMemberInfos": [{ "memberType": "白金会员" }],
    "userLevelInfo": { "level": 4 }
  }
}</code></pre>
</section>
<section class="card ep" id="mg-user-info-phone" data-search="migu user info phone 手机号">
<h3><span class="method">GET</span> <span class="path">/migu/user/info/phone</span></h3>
<p>获取手机号与彩铃信息，并<strong>主动轮换 pacmtoken</strong>：新 token 在响应 cookie 里，服务端自动写回 KV。管理页的“立即刷新”与定时保活任务都调这个接口。手机号等信息在顶层 <code>userInfos</code> 里，不在 <code>data</code> 下。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>pacmtoken</code></td><td>否</td><td>显式指定 token；不传则用存量会话</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/user/info/phone?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "pacmtoken": "ST01...",
  "userInfos": [{ "phone": "157****9983" }]
}</code></pre>
</section>
<section class="card ep" id="mg-login-phone-authn" data-search="migu login phone authn 手机登录">
<h3><span class="method">GET</span> <span class="path">/migu/login/phone/authn</span></h3>
<p>手机号验证码登录。登录成功且传了 <code>isNeedPacm=1</code> 时，会把 pacmtoken 存进服务端 KV（<code>sessionStored: true</code>），后续接口不用再传 token。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>phone</code></td><td>是</td><td>手机号</td></tr>
<tr><td><code>msgCode</code></td><td>是</td><td>短信验证码（先调 <code>/migu/login/phone/msgCode</code> 获取）</td></tr>
<tr><td><code>isNeedPacm</code></td><td>否</td><td>传 <code>1</code> 表示需要 pacmtoken（登录后种会话），默认 <code>false</code></td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/login/phone/authn?phone=13800000000&amp;msgCode=123456&amp;isNeedPacm=1&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "sessionStored": true,
  "data": { "pacmtoken": "ST01..." }
}</code></pre>
</section>
<section class="card ep" id="mg-login-phone-msgcode" data-search="migu login phone msgcode 验证码">
<h3><span class="method">GET</span> <span class="path">/migu/login/phone/msgCode</span></h3>
<p>发送手机验证码短信。调用一次就会真的发一条短信，请勿在测试里用真实手机号频繁调用。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>phone</code></td><td>是</td><td>手机号</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/login/phone/msgCode?phone=13800000000&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功"
}</code></pre>
</section>
<section class="card ep" id="mg-login-sim-query" data-search="migu login sim query 扫码 查询">
<h3><span class="method">GET</span> <span class="path">/migu/login/sim/query</span></h3>
<p>轮询 SIM 快捷登录结果（配合 <code>/migu/login/sim/send</code> 使用）。<code>4071</code> 表示等待用户确认，<code>2000</code> 表示登录成功，<code>4069</code> 表示本次轮询超时。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>sessionId</code></td><td>是</td><td>sim/send 返回的 <code>sim_sessionid</code></td></tr>
<tr><td><code>isNeedPacm</code></td><td>否</td><td>传 <code>1</code> 表示需要 pacmtoken（登录后种会话），默认 <code>false</code></td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/login/sim/query?sessionId=xxx&amp;isNeedPacm=1&amp;key=API_KEY"</code></pre>
<h4>示例响应（成功）</h4>
<pre><code>{
  "success": true,
  "code": "2000",
  "info": "成功",
  "sessionStored": true,
  "data": { "pacmtoken": "ST01..." }
}</code></pre>
</section>
<section class="card ep" id="mg-login-sim-send" data-search="migu login sim send 发送">
<h3><span class="method">GET</span> <span class="path">/migu/login/sim/send</span></h3>
<p>发起 SIM 快捷登录（本机号码一键登录）。返回 <code>sim_sessionid</code> 后轮询 <code>/migu/login/sim/query</code> 等用户在手机上确认。短时间内多次发送会被限流。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>phone</code></td><td>是</td><td>手机号</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/login/sim/send?phone=13800000000&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": { "sim_sessionid": "xxx" }
}</code></pre>
</section>
<section class="card ep" id="mg-passport-checktoken" data-search="migu passport checktoken 验活">
<h3><span class="method">GET</span> <span class="path">/migu/passport/checkToken</span></h3>
<p>验证 pacmtoken 是否还活着。不传 <code>pacmtoken</code> 时验 KV 里存的会话。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>pacmtoken</code></td><td>否</td><td>显式指定 token；不传则验存量会话</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/passport/checkToken?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功"
}</code></pre>
</section>
<section class="card ep" id="mg-passport-getpacmtoken" data-search="migu passport getpacmtoken 换 token">
<h3><span class="method">GET</span> <span class="path">/migu/passport/getPacmToken</span></h3>
<p>用 ST（登录票据）换 pacmtoken。注意：同一个 ST 只能换一次，第二次换会返回空 pacmtoken 与 <code>199999</code>（系统繁忙，请稍后重试）。返回的字段名是 <code>pacmToken</code>（大写 T）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>token</code></td><td>是</td><td>ST 票据</td></tr>
<tr><td><code>type</code></td><td>否</td><td>默认 <code>2</code></td></tr>
<tr><td><code>sourceId</code></td><td>否</td><td>默认 <code>220029</code></td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/passport/getPacmToken?token=STxxx&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": { "pacmToken": "ST01..." }
}</code></pre>
</section>
<section class="card ep" id="mg-passport-logout" data-search="migu passport logout 退出">
<h3><span class="method">GET</span> <span class="path">/migu/passport/logout</span></h3>
<p>退出登录。退的是存量会话且咪咕确认成功时，会清掉服务端 KV 里的登录态（<code>sessionCleared: true</code>）。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/passport/logout?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "pacmtoken": "",
  "sessionCleared": true
}</code></pre>
</section>
<section class="card ep" id="mg-passport-refresh" data-search="migu passport refresh 刷新">
<h3><span class="method">GET</span> <span class="path">/migu/passport/refresh</span></h3>
<p>验证 KV 里存的登录态是否还活着（验活）。token 死了直接报 <code>session_dead</code>，不会自动重新登录。定时保活任务先调这个接口验活，再调 <code>/migu/user/info/phone</code> 轮换 token。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/passport/refresh?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "status": "alive",
  "kvBound": true,
  "hasSession": true,
  "loginMethod": "sim",
  "updatedAt": "2026-11-22T08:00:00.000Z",
  "lastCheckedAt": "2026-11-22T10:00:00.000Z"
}</code></pre>
<p><code>status</code> 可能的值：<code>alive</code>（还活着）、<code>refreshed</code>（已刷新，保留）、<code>session_dead</code>（token 死了，需手动重新登录）、<code>no_session</code>（没登录过）、<code>kv_unavailable</code>（KV 未绑定）。</p>
</section>
<section class="card ep" id="mg-status" data-search="migu status 状态">
<h3><span class="method">GET</span> <span class="path">/migu/status</span> <span class="badge-public">公开</span></h3>
<p>服务状态。无需鉴权。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/status"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "message": "Migu API Enhanced",
  "version": "2.28.1",
  "runtime": "other",
  "dbEnabled": false,
  "allowedOrigins": "",
  "kvBound": true
}</code></pre>
</section>
<section class="card ep" id="mg-version" data-search="migu version 版本">
<h3><span class="method">GET</span> <span class="path">/migu/version</span> <span class="badge-public">公开</span></h3>
<p>版本号。无需鉴权。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/version"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "version": "2.28.1"
}</code></pre>
</section>
<section class="card ep" id="mg-lyric" data-search="migu lyric 歌词">
<h3><span class="method">GET</span> <span class="path">/migu/lyric</span></h3>
<p>获取歌词（LRC 格式）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>contentId</code></td><td>是</td><td>歌曲 contentId</td></tr>
<tr><td><code>type</code></td><td>否</td><td>歌词类型，默认 <code>lrc</code></td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/lyric?contentId=600902000006889366&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "lyric": "[00:00.00]晴天\n[00:05.00]故事的小黄花..."
  }
}</code></pre>
</section>
<section class="card ep" id="mg-mrc" data-search="migu mrc 歌词">
<h3><span class="method">GET</span> <span class="path">/migu/mrc</span></h3>
<p>获取逐字歌词（MRC 格式，带每个字的时间戳）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>contentId</code></td><td>是</td><td>歌曲 contentId</td></tr>
<tr><td><code>type</code></td><td>否</td><td>默认 <code>standard</code></td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/mrc?contentId=600902000006889366&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "lyric": "[00:05.00]故&lt;00:05.20&gt;事&lt;00:05.40&gt;的&lt;00:05.60&gt;小&lt;00:05.80&gt;黄&lt;00:06.00&gt;花"
  }
}</code></pre>
</section>
<section class="card ep" id="mg-resourceinfo" data-search="migu resourceinfo 资源">
<h3><span class="method">GET</span> <span class="path">/migu/resourceinfo</span></h3>
<p>批量获取歌曲资源信息（多个 contentId / copyrightId 一次查）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>resourceIds</code></td><td>否</td><td>contentId 列表，逗号分隔</td></tr>
<tr><td><code>copyrightIds</code></td><td>否</td><td>copyrightId 列表，逗号分隔</td></tr>
<tr><td><code>resourceType</code></td><td>否</td><td>资源类型，默认 2</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/resourceinfo?resourceIds=600902000006889366&amp;copyrightIds=60054701923&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "items": [
      { "contentId": "600902000006889366", "songName": "晴天" }
    ]
  }
}</code></pre>
</section>
<section class="card ep" id="mg-songinfo-contentid" data-search="migu songinfo contentid 歌曲信息">
<h3><span class="method">GET</span> <span class="path">/migu/songinfo/contentId</span></h3>
<p>按 contentId 批量查歌曲信息。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>contentIds</code></td><td>是</td><td>contentId 列表，逗号分隔</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/songinfo/contentId?contentIds=600902000006889366&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "items": [
      { "contentId": "600902000006889366", "songName": "晴天", "singer": "周杰伦" }
    ]
  }
}</code></pre>
</section>
<section class="card ep" id="mg-songinfo-songid" data-search="migu songinfo songid 歌曲信息">
<h3><span class="method">GET</span> <span class="path">/migu/songinfo/songId</span></h3>
<p>按 songId 批量查歌曲信息。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>songIds</code></td><td>是</td><td>songId 列表，逗号分隔</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/songinfo/songId?songIds=3790007&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "items": [
      { "songId": "3790007", "songName": "晴天", "singer": "周杰伦" }
    ]
  }
}</code></pre>
</section>
<section class="card ep" id="mg-songinfo-songid-simple" data-search="migu songinfo songid simple 歌曲信息">
<h3><span class="method">GET</span> <span class="path">/migu/songinfo/songId/simple</span></h3>
<p>按单个 songId 查歌曲简要信息（返回 songId 对应的 contentId 等）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>songId</code></td><td>是</td><td>歌曲 songId</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/migu/songinfo/songId/simple?songId=3790007&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "success": true,
  "code": "000000",
  "info": "成功",
  "data": {
    "songId": "3790007",
    "contentId": "600902000006889366",
    "songName": "晴天"
  }
}</code></pre>
</section>
<h2 class="section-title">网易云</h2>
<section class="card ep" id="ne-search" data-search="netease search 搜索">
<h3><span class="method">GET</span> <span class="path">/netease/search</span></h3>
<p>搜索。type 决定搜索类型：1 单曲、10 专辑、100 歌手、1000 歌单、1002 用户、1004 MV、1006 歌词、1009 电台、1014 视频。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>keywords</code></td><td>是</td><td>搜索关键词，例如“晴天”</td></tr>
<tr><td><code>limit</code></td><td>否</td><td>每页条数，默认 30</td></tr>
<tr><td><code>offset</code></td><td>否</td><td>偏移量，默认 0</td></tr>
<tr><td><code>type</code></td><td>否</td><td>搜索类型，默认 1（单曲）</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/search?keywords=晴天&amp;limit=10&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "result": {
    "songCount": 100,
    "songs": [
      {
        "id": 2668397359,
        "name": "晴天",
        "ar": [{ "id": 6452, "name": "周杰伦" }],
        "al": { "id": 12345, "name": "叶惠美" },
        "dt": 269000
      }
    ]
  }
}</code></pre>
</section>
<section class="card ep" id="ne-search-hot" data-search="netease search hot 热搜">
<h3><span class="method">GET</span> <span class="path">/netease/search/hot</span></h3>
<p>热搜榜。返回热门搜索关键词，无需参数。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/search/hot?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": [
    { "searchWord": "晴天", "score": 100000, "content": "周杰伦" }
  ]
}</code></pre>
</section>
<section class="card ep" id="ne-search-hot-detail" data-search="netease search hot detail 热搜详情">
<h3><span class="method">GET</span> <span class="path">/netease/search/hot/detail</span></h3>
<p>热搜榜详情。返回带热度分数与描述的热搜列表，无需参数。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/search/hot/detail?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": [
    { "searchWord": "晴天", "score": 100000, "content": "周杰伦 - 晴天", "iconType": 1 }
  ]
}</code></pre>
</section>
<section class="card ep" id="ne-song-url" data-search="netease song url 取链 v2">
<h3><span class="method">GET</span> <span class="path">/netease/song/url</span></h3>
<p>取播放链接（v2）。v2 原版只认 <code>br</code>（码率数字），本服务让它也认 <code>level</code>：传 <code>level</code> 时按档位换算成 <code>br</code>；同时传了 <code>br</code> 时 <code>br</code> 优先；都不传默认 999000（最高音质）。注意：同一首歌有时会返回 <code>url: null</code>（网易侧波动，重试即可）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>id</code></td><td>是</td><td>歌曲 id，可传多个（逗号分隔）</td></tr>
<tr><td><code>level</code></td><td>否</td><td>音质等级：standard / higher / exhigh / lossless / hires / jyeffect / sky / jymaster / vivid</td></tr>
<tr><td><code>br</code></td><td>否</td><td>码率数字，例如 128000；传了就优先于 level</td></tr>
</table>
<h4>level 换算表</h4>
<table class="params">
<tr><th>level</th><th>换算 br</th><th>实际返回</th></tr>
<tr><td><code>standard</code></td><td>128000</td><td>128k mp3</td></tr>
<tr><td><code>higher</code></td><td>192000</td><td>192k mp3</td></tr>
<tr><td><code>exhigh</code></td><td>320000</td><td>320k mp3</td></tr>
<tr><td><code>lossless</code> / <code>hires</code> / <code>jyeffect</code> / <code>sky</code> / <code>jymaster</code> / <code>vivid</code></td><td>999000</td><td>最高可用音质（例如 646k flac；若歌曲本身没有真 Hi-Res，lossless 与 hires 返回相同文件）</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/song/url?id=2668397359&amp;level=exhigh&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": [
    {
      "id": 2668397359,
      "url": "https://m801.music.126.net/.../2668397359.mp3",
      "br": 320000,
      "size": 10780000,
      "md5": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "code": 200,
      "expi": 1200,
      "type": "mp3",
      "gain": 0,
      "fee": 0,
      "level": "exhigh",
      "encodeType": "mp3"
    }
  ]
}</code></pre>
</section>
<section class="card ep" id="ne-song-url-v1" data-search="netease song url v1 取链">
<h3><span class="method">GET</span> <span class="path">/netease/song/url/v1</span></h3>
<p>取播放链接（v1）。v1 原生就认 <code>level</code>，直接传给网易。level 为 <code>sky</code> 时可用 <code>immerseType</code> 选沉浸声类型（c512、ste2、aac2、c51、ste、aac，默认 c51）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>id</code></td><td>是</td><td>歌曲 id，可传多个（逗号分隔）</td></tr>
<tr><td><code>level</code></td><td>否</td><td>音质等级：standard / higher / exhigh / lossless / hires / jyeffect / sky / jymaster / vivid</td></tr>
<tr><td><code>immerseType</code></td><td>否</td><td>level 为 sky 时的沉浸声类型，默认 c51</td></tr>
<tr><td><code>unblock</code></td><td>否</td><td>是否尝试解锁灰色歌曲</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/song/url/v1?id=2668397359&amp;level=lossless&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": [
    {
      "id": 2668397359,
      "url": "https://m801.music.126.net/.../2668397359.flac",
      "br": 646443,
      "size": 21700000,
      "code": 200,
      "expi": 1200,
      "type": "flac",
      "fee": 0,
      "level": "lossless",
      "encodeType": "flac"
    }
  ]
}</code></pre>
</section>
<section class="card ep" id="ne-song-download-url" data-search="netease song download url 下载">
<h3><span class="method">GET</span> <span class="path">/netease/song/download/url</span></h3>
<p>取下载链接。注意：这个接口只认 <code>br</code>（码率数字），不认 <code>level</code>，要指定音质请传 <code>br</code>。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>id</code></td><td>是</td><td>歌曲 id</td></tr>
<tr><td><code>br</code></td><td>否</td><td>码率数字，默认 999000（最高音质）</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/song/download/url?id=2668397359&amp;br=320000&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": {
    "id": 2668397359,
    "url": "https://m801.music.126.net/.../2668397359.mp3",
    "br": 320000,
    "size": 10780000,
    "md5": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "code": 200,
    "expi": 1200,
    "type": "mp3"
  }
}</code></pre>
</section>
<section class="card ep" id="ne-user-account" data-search="netease user account 账号">
<h3><span class="method">GET</span> <span class="path">/netease/user/account</span></h3>
<p>获取当前登录账号信息。未登录时返回匿名账号（<code>anonimousUser: true</code>）。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/user/account?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "account": {
    "id": 1295433548,
    "userName": "1_********983",
    "type": 1,
    "status": 0,
    "whitelistAuthority": 0,
    "createTime": 1500000000000,
    "tokenVersion": 1,
    "ban": 0,
    "baoyueVersion": 1,
    "donateVersion": 0,
    "vipType": 11,
    "anonimousUser": false,
    "paidFee": true
  },
  "profile": {
    "userId": 1295433548,
    "nickname": "与Yo同行",
    "avatarUrl": "https://p1.music.126.net/.../avatar.jpg",
    "vipType": 11
  }
}</code></pre>
</section>
<section class="card ep" id="ne-user-detail" data-search="netease user detail 用户详情 会员">
<h3><span class="method">GET</span> <span class="path">/netease/user/detail</span></h3>
<p>获取指定用户的详情，含会员类型。<code>vipType</code>：11 黑胶 VIP、10 音乐包、0 无会员。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>uid</code></td><td>是</td><td>用户 id</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/user/detail?uid=1295433548&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "profile": {
    "userId": 1295433548,
    "nickname": "与Yo同行",
    "avatarUrl": "https://p1.music.126.net/.../avatar.jpg",
    "vipType": 11,
    "userType": 0
  },
  "level": 6,
  "listenSongs": 12345
}</code></pre>
</section>
<section class="card ep" id="ne-user-level" data-search="netease user level 等级">
<h3><span class="method">GET</span> <span class="path">/netease/user/level</span></h3>
<p>获取当前登录用户的等级与升级进度。需要登录；未登录返回 301（需要登录）。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/user/level?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": {
    "level": 6,
    "progress": 0.325,
    "nowPlayCount": 100,
    "nowLoginCount": 50,
    "nextPlayCount": 10000,
    "nextLoginCount": 200
  }
}</code></pre>
</section>
<section class="card ep" id="ne-login-cellphone" data-search="netease login cellphone 手机号登录">
<h3><span class="method">GET</span> <span class="path">/netease/login/cellphone</span></h3>
<p>手机号登录。密码会先在服务端做 MD5，也可以直接传 <code>md5_password</code>。登录成功后会话 cookie 由服务端存进 KV，后续请求不用再带 cookie。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>phone</code></td><td>是</td><td>手机号</td></tr>
<tr><td><code>password</code></td><td>否</td><td>密码（与 <code>md5_password</code> 二选一）</td></tr>
<tr><td><code>md5_password</code></td><td>否</td><td>密码的 MD5 值</td></tr>
<tr><td><code>countrycode</code></td><td>否</td><td>国家区号，默认 86</td></tr>
<tr><td><code>captcha</code></td><td>否</td><td>验证码（走验证码登录时传）</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/login/cellphone?phone=13800000000&amp;password=xxxxxx&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "account": { "id": 1295433548, "userName": "1_********983", "vipType": 11 },
  "profile": { "userId": 1295433548, "nickname": "与Yo同行" },
  "cookie": "MUSIC_U=xxx; ..."
}</code></pre>
</section>
<section class="card ep" id="ne-login-qr-key" data-search="netease login qr key 扫码 key">
<h3><span class="method">GET</span> <span class="path">/netease/login/qr/key</span></h3>
<p>扫码登录第一步：获取二维码的 key（unikey）。拿到后调 <code>/netease/login/qr/create</code> 生成二维码，再轮询 <code>/netease/login/qr/check</code> 等扫码确认。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/login/qr/key?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": {
    "code": 200,
    "unikey": "636f6311-498e-4770-ab46-9ed3f6701da7"
  }
}</code></pre>
</section>
<section class="card ep" id="ne-login-qr-create" data-search="netease login qr create 扫码 二维码">
<h3><span class="method">GET</span> <span class="path">/netease/login/qr/create</span></h3>
<p>扫码登录第二步：根据 unikey 生成登录二维码。注意：这个接口的 <code>key</code> 参数是网易的 unikey，与鉴权用的 <code>key</code> 重名——API_KEY 必须走 <code>Authorization: Bearer</code> 请求头，unikey 走 <code>?key=&lt;unikey&gt;</code>。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>key</code></td><td>是</td><td>unikey（qr/key 返回的）</td></tr>
<tr><td><code>qrimg</code></td><td>否</td><td>传 <code>true</code> 时返回二维码图的 SVG data URL（可直接放进 img 标签）</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl -H "Authorization: Bearer API_KEY" "https://your-domain/netease/login/qr/create?key=636f6311-498e-4770-ab46-9ed3f6701da7&amp;qrimg=true"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": {
    "qrurl": "https://music.163.com/login?codekey=636f6311-498e-4770-ab46-9ed3f6701da7",
    "qrimg": "data:image/svg+xml;base64,..."
  }
}</code></pre>
</section>
<section class="card ep" id="ne-login-qr-check" data-search="netease login qr check 扫码 检查">
<h3><span class="method">GET</span> <span class="path">/netease/login/qr/check</span></h3>
<p>扫码登录第三步：轮询扫码状态。同样注意 <code>key</code> 重名问题，API_KEY 走请求头。<code>801</code> 等待扫码，<code>802</code> 待确认，<code>803</code> 授权登录成功（此时服务端自动把会话 cookie 存进 KV）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>key</code></td><td>是</td><td>unikey（qr/key 返回的）</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl -H "Authorization: Bearer API_KEY" "https://your-domain/netease/login/qr/check?key=636f6311-498e-4770-ab46-9ed3f6701da7"</code></pre>
<h4>示例响应（成功）</h4>
<pre><code>{
  "code": 803,
  "message": "授权登陆成功",
  "cookie": "MUSIC_U=xxx; ..."
}</code></pre>
</section>
<section class="card ep" id="ne-login-refresh" data-search="netease login refresh 刷新">
<h3><span class="method">GET</span> <span class="path">/netease/login/refresh</span></h3>
<p>刷新登录态（续期）。用 KV 里存的会话 cookie 续期，成功后新 cookie 由服务端自动存回 KV。登录已失效时返回非 200，需重新登录（扫码或手机号）。定时任务每 6 小时调一次这个接口保活。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/login/refresh?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "cookie": "MUSIC_U=xxx; ..."
}</code></pre>
</section>
<section class="card ep" id="ne-login-status" data-search="netease login status 登录状态">
<h3><span class="method">GET</span> <span class="path">/netease/login/status</span></h3>
<p>获取当前登录状态。已登录返回真实账号；未登录返回匿名账号（<code>anonimousUser: true</code>）。响应里还多带一个 <code>session</code> 字段：会话更新时间与登录 token（管理页用，脱敏展示）。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/login/status?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "data": {
    "code": 200,
    "account": {
      "id": 1295433548,
      "userName": "1_********983",
      "vipType": 11,
      "anonimousUser": false
    },
    "profile": {
      "userId": 1295433548,
      "nickname": "与Yo同行"
    }
  },
  "session": {
    "updatedAt": "2026-11-22T10:26:50.403Z",
    "token": "MUSIC_U 的值（管理页脱敏展示）"
  }
}</code></pre>
</section>
<section class="card ep" id="ne-logout" data-search="netease logout 退出">
<h3><span class="method">GET</span> <span class="path">/netease/logout</span></h3>
<p>退出登录。成功后清掉服务端 KV 里存的会话。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/logout?key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200
}</code></pre>
</section>
<section class="card ep" id="ne-lyric" data-search="netease lyric 歌词">
<h3><span class="method">GET</span> <span class="path">/netease/lyric</span></h3>
<p>获取歌词。返回原文歌词（<code>lrc.lyric</code>）与翻译歌词（<code>tlyric.lyric</code>，可能为空）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>id</code></td><td>是</td><td>歌曲 id</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/lyric?id=2668397359&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "lrc": {
    "version": 1,
    "lyric": "[00:00.00]晴天\n[00:05.00]故事的小黄花..."
  },
  "tlyric": { "version": 0, "lyric": "" }
}</code></pre>
</section>
<section class="card ep" id="ne-song-detail" data-search="netease song detail 歌曲详情">
<h3><span class="method">GET</span> <span class="path">/netease/song/detail</span></h3>
<p>获取歌曲详情。可一次查多首（ids 逗号分隔）。</p>
<table class="params">
<tr><th>参数</th><th>必填</th><th>说明</th></tr>
<tr><td><code>ids</code></td><td>是</td><td>歌曲 id，多个用逗号分隔，例如 2668397359,123456</td></tr>
</table>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/song/detail?ids=2668397359&amp;key=API_KEY"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "code": 200,
  "songs": [
    {
      "id": 2668397359,
      "name": "晴天",
      "ar": [{ "id": 6452, "name": "周杰伦" }],
      "al": { "id": 12345, "name": "叶惠美", "picUrl": "https://p2.music.126.net/.../cover.jpg" },
      "dt": 269000,
      "fee": 0,
      "mv": 0
    }
  ]
}</code></pre>
</section>
<section class="card ep" id="ne-status" data-search="netease status 状态">
<h3><span class="method">GET</span> <span class="path">/netease/status</span> <span class="badge-public">公开</span></h3>
<p>服务状态。无需鉴权。<code>kvBound</code> 表示网易云登录态的 KV（NETEASE_KV）是否已绑定：未绑定时登录态只存内存，节点切换后失效，需重新登录。</p>
<h4>示例请求</h4>
<pre><code>curl "https://your-domain/netease/status"</code></pre>
<h4>示例响应</h4>
<pre><code>{
  "message": "Netease API Enhanced",
  "version": "4.41.1",
  "runtime": "other",
  "kvBound": true
}</code></pre>
</section>
</main>
</div>
<script>
(function(){
  var toggle = document.getElementById('menuToggle');
  var sidebar = document.querySelector('.sidebar');
  if(toggle && sidebar){
    toggle.addEventListener('click', function(){
      var open = sidebar.classList.toggle('open');
      toggle.textContent = open ? '✕ 收起目录' : '☰ 目录';
    });
    sidebar.addEventListener('click', function(e){
      var a = e.target.closest ? e.target.closest('a') : null;
      if(a){
        sidebar.classList.remove('open');
        toggle.textContent = '☰ 目录';
      }
    });
  }
  var input = document.getElementById('filterInput');
  if(!input) return;
  input.addEventListener('input', function(){
    var q = input.value.trim().toLowerCase();
    var cards = document.querySelectorAll('.ep');
    for(var i = 0; i < cards.length; i++){
      var text = (cards[i].getAttribute('data-search') || '').toLowerCase();
      cards[i].style.display = (!q || text.indexOf(q) !== -1) ? '' : 'none';
    }
    var links = document.querySelectorAll('.sidebar a');
    for(var j = 0; j < links.length; j++){
      var lt = ((links[j].getAttribute('data-search') || '') + ' ' + links[j].textContent).toLowerCase();
      links[j].style.display = (!q || lt.indexOf(q) !== -1) ? '' : 'none';
    }
  });
})();
</script>
</body>
</html>
`;
