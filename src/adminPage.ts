/**
 * 统一管理页面 /admin（单文件 HTML，内联 CSS/JS，无外部依赖）。
 *
 * - 样式跟随一言 /stats（hitokoto.xzccs.top/stats）的设计变量：靛蓝主色
 *   #6366F1、浅色背景、圆角卡片、胶囊状态徽章。
 * - 分两个区：咪咕（会话、用户、会员、播放测试、接口状态）与网易云
 *   （登录状态、搜索与取链测试、接口状态）。/miguadmin 301 跳转到 /admin。
 * - 页面本身公开（见 src/middleware/auth.ts 的 PUBLIC_PATHS），否则没 Key
 *   会直接返回 401 JSON、连输入框都看不到；真正的数据请求都要带 Key，
 *   没通过校验什么都看不到、也调不动。
 * - Key 只存在 sessionStorage（关标签页即清除）或 localStorage（勾选记住），
 *   不写进页面、不写 cookie。
 * - 咪咕的数据都用 KV 里存着的 pacmtoken，不用再传 pacmtoken 参数。
 * - 咪咕会员等级取自 /migu/user/info 的 userMemberInfos 与 userLevelInfo；
 *   播放测试可自选接口（v1 / v2 / h5v2.4）与音质（toneFlag）。
 * - 网易云取链可自选接口（song/url v2 / song/url/v1）与音质等级。
 */
export const adminPageHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>音乐 API 管理</title>
<style>
/* 样式跟随一言 /stats（hitokoto.xzccs.top/stats）的设计变量：靛蓝主色、浅色背景、圆角卡片。 */
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
  --color-success-container: #dcfce7;
  --color-on-success-container: #14532d;
  --color-error: #dc2626;
  --color-error-container: #fee2e2;
  --color-on-error-container: #7f1d1d;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 999px;
  --shadow-sm: 0 1px 2px rgb(15 23 42 / 0.06);
  --font-sans: -apple-system, "BlinkMacSystemFont", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-sans); background: var(--color-background); color: var(--color-text); }
.page-head { padding: 24px 0 8px; }
.page-head .eyebrow { margin: 0 0 6px; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--color-text-muted); }
.page-head h1 { margin: 0; font-size: 24px; }
.page-head .intro { margin: 6px 0 0; font-size: 14px; color: var(--color-text-secondary); }
main { max-width: 720px; margin: 0 auto; padding: 16px; }
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: 20px; margin-bottom: 16px; box-shadow: var(--shadow-sm); }
.card h2 { margin: 0 0 12px; font-size: 17px; }
.section-title { margin: 24px 0 12px; font-size: 19px; border-bottom: 2px solid var(--color-primary); padding-bottom: 6px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
input[type=text], input[type=password], select { font-size: 15px; padding: 9px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); }
input[type=text]:focus, input[type=password]:focus, select:focus { outline: 2px solid var(--color-primary); outline-offset: 0; }
input[type=text], input[type=password] { flex: 1; min-width: 0; }
button { font-size: 15px; padding: 9px 16px; border-radius: var(--radius-md); border: none; background: var(--color-primary); color: #fff; cursor: pointer; }
button:hover { background: var(--color-primary-hover); }
button:disabled { opacity: .6; cursor: default; }
button.secondary { background: transparent; color: var(--color-primary); border: 1px solid var(--color-border); }
button.secondary:hover { background: var(--color-primary-container); }
.pill { display: inline-block; padding: 4px 12px; border-radius: var(--radius-full); font-size: 13px; }
.pill.ok { background: var(--color-success-container); color: var(--color-on-success-container); }
.pill.err { background: var(--color-error-container); color: var(--color-on-error-container); }
.muted { color: var(--color-text-secondary); font-size: 13px; }
.error { color: var(--color-error); font-size: 14px; }
.ok { color: var(--color-success); }
.kv { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid var(--color-surface-variant); font-size: 14px; }
.kv:last-child { border-bottom: none; }
.kv span:first-child { color: var(--color-text-secondary); flex: none; }
.kv span:last-child { text-align: right; word-break: break-all; }
.song { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: 8px; cursor: pointer; font-size: 14px; background: var(--color-surface); }
.song.sel { border-color: var(--color-primary); background: var(--color-primary-container); }
.songTitle { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toneSel { flex: none; max-width: 132px; font-size: 14px; padding: 7px 8px; }
.playBtn { flex: none; padding: 7px 12px; }
.avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
.member { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 14px; }
.member img { width: 36px; height: 36px; border-radius: 8px; object-fit: contain; }
audio { width: 100%; margin-top: 10px; }
.lyricBox { max-height: 220px; overflow-y: auto; white-space: pre-wrap; word-break: break-all; font-size: 13px; line-height: 1.6; color: var(--color-text-secondary); background: var(--color-surface-variant); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px 12px; margin-top: 8px; }
</style>
</head>
<body>
<main>
<header class="page-head">
<p class="eyebrow">MUSIC · ADMIN</p>
<h1>音乐 API 管理</h1>
<p class="intro">migu.api.xzccs.top · 咪咕与网易云</p>
</header>
<section class="card" id="gate">
<h2>输入 Key 进入</h2>
<p class="muted">Key 与 EdgeOne 控制台的 API_KEY 一致，咪咕与网易云共用，只保存在当前标签页，关闭即清除。</p>
<div class="row">
<input type="password" id="keyInput" placeholder="API Key" autocomplete="off">
<button id="enterBtn">进入</button>
</div>
<label style="display:flex; gap:6px; align-items:center; margin-top:10px; font-size:14px; cursor:pointer;"><input type="checkbox" id="rememberKey"> 记住 Key（保存在当前浏览器，下次打开不用再输）</label>
<p class="error" id="gateErr"></p>
</section>
<div id="dash" hidden>
<h2 class="section-title">咪咕</h2>
<section class="card">
<h2>会话状态</h2>
<div id="sessionBody"><p class="muted">加载中…</p></div>
<div style="margin-top:12px;">
<div class="muted" style="margin-bottom:4px;">pacmtoken</div>
<div id="pacmTokenVal" style="word-break:break-all; font-size:13px; background:var(--color-surface-variant); border:1px solid var(--color-border); border-radius:var(--radius-md); padding:8px 10px;">加载中…</div>
<div class="row" style="margin-top:8px;">
<button id="togglePacmBtn" class="secondary">显示完整 token</button>
<button id="copyPacmBtn" class="secondary">复制</button>
</div>
</div>
<div class="row" style="margin-top:12px;">
<button id="refreshBtn" class="secondary">立即刷新</button>
<button id="logoutBtn" class="secondary">退出登录</button>
<button id="exitBtn" class="secondary">退出管理</button>
</div>
<p id="refreshMsg" class="muted" role="status"></p>
</section>
<section class="card">
<h2>当前用户</h2>
<div id="userBody"><p class="muted">加载中…</p></div>
</section>
<section class="card">
<h2>会员等级</h2>
<div id="memberBody"><p class="muted">加载中…</p></div>
</section>
<section class="card">
<h2>播放测试</h2>
<div class="row">
<input type="text" id="searchInput" placeholder="输入歌名，例如：晴天">
<button id="searchBtn">搜索</button>
</div>
<p class="error" id="searchErr"></p>
<div id="searchResults" style="margin-top:12px;"></div>
<div class="row" style="margin-top:12px;">
<select id="endpointSel">
<option value="h5v2.4" selected>h5v2.4</option>
<option value="v1">v1</option>
<option value="v2">v2</option>
</select>
<button id="getUrlBtn">获取播放链接</button>
</div>
<p class="error" id="playErr"></p>
<div id="playResult" style="margin-top:8px;"></div>
<div id="audioWrap"></div>
</section>
<section class="card">
<h2>接口状态</h2>
<div id="statusBody"><p class="muted">加载中…</p></div>
</section>
<h2 class="section-title">网易云</h2>
<section class="card">
<h2>登录状态</h2>
<div id="neLoginBody"><p class="muted">加载中…</p></div>
<div class="row" style="margin-top:12px;">
<button id="neLogoutBtn" class="secondary">退出登录</button>
</div>
<p class="muted">登录请走接口：/netease/login/cellphone（手机号）或 /netease/login/qr/key → /login/qr/create → /login/qr/check（扫码）。</p>
</section>
<section class="card">
<h2>搜索与取链测试</h2>
<div class="row">
<input type="text" id="neSearchInput" placeholder="输入歌名，例如：晴天">
<button id="neSearchBtn">搜索</button>
</div>
<p class="error" id="neSearchErr"></p>
<div id="neSearchResults" style="margin-top:12px;"></div>
<div class="row" style="margin-top:12px;">
<select id="neEndpointSel">
<option value="url" selected>song/url（v2）</option>
<option value="url/v1">song/url/v1</option>
</select>
<select id="neLevelSel">
<option value="standard" selected>standard</option>
<option value="higher">higher</option>
<option value="exhigh">exhigh</option>
<option value="lossless">lossless</option>
<option value="hires">hires</option>
</select>
<button id="neGetUrlBtn">获取播放链接</button>
<button id="neGetLyricBtn" class="secondary">获取歌词</button>
</div>
<p class="error" id="nePlayErr"></p>
<div id="nePlayResult" style="margin-top:8px;"></div>
<div id="neAudioWrap"></div>
<div id="neLyricWrap"></div>
</section>
<section class="card">
<h2>接口状态</h2>
<div id="neStatusBody"><p class="muted">加载中…</p></div>
</section>
</div>
</main>
<script>
function $(id){ return document.getElementById(id); }
function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
function lsDel(k){ try { localStorage.removeItem(k); } catch(e){} }
// Key 存储键名保持 migu_admin_key 不变（与旧 /miguadmin 一致），
// 已记住 Key 的用户打开 /admin 不用重输；它是咪咕与网易云共用的 API_KEY。
var apiKey = lsGet('migu_admin_key') || sessionStorage.getItem('migu_admin_key') || '';
var selectedSong = null;
var songs = [];
var currentPacmToken = '';
var pacmShown = false;
var neSelectedSong = null;
var neSongs = [];

function esc(s){
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function fmtTime(iso){
  if(!iso) return '-';
  try { return new Date(iso).toLocaleString(); } catch(e){ return iso; }
}
function apiHeaders(){ return { 'Authorization': 'Bearer ' + apiKey }; }
async function api(path){
  var r = await fetch(path, { headers: apiHeaders() });
  if(r.status === 401){ var e = new Error('unauthorized'); e.code = 401; throw e; }
  return r.json();
}
function showGate(msg){
  $('dash').hidden = true;
  $('gate').hidden = false;
  $('gateErr').textContent = msg || '';
}
function showDash(){
  $('gate').hidden = true;
  $('dash').hidden = false;
}
function renderPacmToken(){
  var el = $('pacmTokenVal');
  if(!currentPacmToken){ el.textContent = '无（未登录或已退出）'; $('togglePacmBtn').textContent = '显示完整 token'; return; }
  if(pacmShown){ el.textContent = currentPacmToken; $('togglePacmBtn').textContent = '隐藏 token'; }
  else { el.textContent = currentPacmToken.slice(0, 12) + '…' + currentPacmToken.slice(-8); $('togglePacmBtn').textContent = '显示完整 token'; }
}
function togglePacm(){ pacmShown = !pacmShown; renderPacmToken(); }
function copyPacm(){
  var v = currentPacmToken;
  if(!v){ return; }
  function done(ok){ $('copyPacmBtn').textContent = ok ? '已复制' : '复制失败'; setTimeout(function(){ $('copyPacmBtn').textContent = '复制'; }, 1500); }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(v).then(function(){ done(true); }, function(){ done(false); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = v;
    document.body.appendChild(ta);
    ta.select();
    try { done(document.execCommand('copy')); } catch(e){ done(false); }
    document.body.removeChild(ta);
  }
}
async function enterKey(){
  var v = $('keyInput').value.trim();
  if(!v){ $('gateErr').textContent = '请先输入 Key'; return; }
  apiKey = v;
  $('gateErr').textContent = '校验中…';
  $('enterBtn').disabled = true;
  try {
    await api('/migu/passport/refresh');
    if($('rememberKey').checked){ lsSet('migu_admin_key', apiKey); sessionStorage.removeItem('migu_admin_key'); }
    else { sessionStorage.setItem('migu_admin_key', apiKey); lsDel('migu_admin_key'); }
    showDash();
    loadAll();
  } catch(e){
    $('gateErr').textContent = (e && e.code === 401) ? 'Key 不正确' : '校验失败，请检查网络后重试';
  } finally {
    $('enterBtn').disabled = false;
  }
}
function exitAdmin(){
  apiKey = '';
  sessionStorage.removeItem('migu_admin_key');
  lsDel('migu_admin_key');
  $('keyInput').value = '';
  showGate('');
}
var STATUS_TEXT = { alive: '运行中', refreshed: '已刷新', no_session: '未登录', session_dead: '已失效，需重新登录', kv_unavailable: 'KV 未绑定', error: '异常' };
function statusClass(s){ return (s === 'alive' || s === 'refreshed') ? 'pill ok' : 'pill err'; }
async function loadSession(){
  try {
    var j = await api('/migu/passport/refresh');
    var html = '<div class="kv"><span>状态</span><span class="' + statusClass(j.status) + '">' + esc(STATUS_TEXT[j.status] || j.status || '-') + '</span></div>'
      + '<div class="kv"><span>登录方式</span><span>' + esc(j.loginMethod === 'sim' ? 'SIM 快捷登录' : (j.loginMethod === 'phone' ? '手机验证码登录' : (j.loginMethod || '-'))) + '</span></div>'
      + '<div class="kv"><span>会话更新时间</span><span>' + esc(fmtTime(j.updatedAt)) + '</span></div>'
      + '<div class="kv"><span>最后检查时间</span><span>' + esc(fmtTime(j.lastCheckedAt)) + '</span></div>';
    if(j.reason){ html += '<p class="muted">' + esc(j.reason) + '</p>'; }
    $('sessionBody').innerHTML = html;
  } catch(e){
    $('sessionBody').innerHTML = '<p class="error">加载失败</p>';
  }
}
async function loadUser(){
  try {
    var j = await api('/migu/user/info');
    currentPacmToken = j.pacmtoken || '';
    pacmShown = false;
    renderPacmToken();
    var it = j.userInfoItem || null;
    if(!it || !it.userId){
      $('userBody').innerHTML = '<p class="muted">未登录或已退出，请重新登录。</p>';
      $('memberBody').innerHTML = '<p class="muted">未登录或已退出，请重新登录。</p>';
      return;
    }
    var sex = it.sex === '1' || it.sex === 1 ? '男' : (it.sex === '2' || it.sex === 2 ? '女' : (it.sex || '-'));
    var html = '';
    if(it.bigIcon){ html += '<img class="avatar" src="' + esc(it.bigIcon) + '" alt="">'; }
    html += '<div class="kv"><span>昵称</span><span>' + esc(it.nickName || '-') + '</span></div>'
      + '<div class="kv"><span>userId</span><span>' + esc(it.userId || '-') + '</span></div>'
      + '<div class="kv"><span>手机号</span><span>' + esc(it.msisdn || '-') + '</span></div>'
      + '<div class="kv"><span>性别</span><span>' + esc(sex) + '</span></div>'
      + '<div class="kv"><span>注册时间</span><span>' + esc(it.registerTime || '-') + '</span></div>';
    $('userBody').innerHTML = html;
    var mh = '';
    var members = it.userMemberInfos || [];
    if(members.length){
      members.forEach(function(m){
        mh += '<div class="member">' + (m.icon ? '<img src="' + esc(m.icon) + '" alt="">' : '') + '<span>' + esc(m.name || '会员') + '</span></div>';
      });
    } else {
      mh += '<p class="muted">暂无会员</p>';
    }
    var lv = it.userLevelInfo || null;
    if(lv){
      mh += '<div class="kv"><span>用户等级</span><span>' + esc(lv.levelName || lv.level || '-') + '</span></div>';
      if(lv.levelDesc){ mh += '<p class="muted">' + esc(lv.levelDesc) + '</p>'; }
    }
    $('memberBody').innerHTML = mh;
  } catch(e){
    $('userBody').innerHTML = '<p class="error">加载失败</p>';
    $('memberBody').innerHTML = '<p class="error">加载失败</p>';
    $('pacmTokenVal').textContent = '加载失败';
  }
}
async function loadStatus(){
  try {
    var j = await api('/migu/status');
    $('statusBody').innerHTML = '<div class="kv"><span>版本</span><span>' + esc(j.version || '-') + '</span></div>'
      + '<div class="kv"><span>运行环境</span><span>' + esc(j.runtime || '-') + '</span></div>'
      + '<div class="kv"><span>数据库</span><span>' + (j.dbEnabled ? '已启用' : '未启用') + '</span></div>'
      + '<div class="kv"><span>允许跨域</span><span>' + esc(j.allowedOrigins || '全部') + '</span></div>';
  } catch(e){
    $('statusBody').innerHTML = '<p class="error">加载失败</p>';
  }
}
function loadAll(){ loadSession(); loadUser(); loadStatus(); loadNeLoginStatus(); loadNeStatus(); }
async function doRefresh(){
  // 用 /user/info/phone 主动轮换 pacmtoken（返回新 token 并写回 KV），
  // 再刷新会话状态与用户信息；token 已死时换不到，会照实显示 session_dead。
  var msg = $('refreshMsg');
  msg.textContent = '刷新中…';
  msg.className = 'muted';
  $('refreshBtn').disabled = true;
  var rotated = false;
  var failInfo = '';
  try {
    var j = await api('/migu/user/info/phone');
    if(j.pacmtoken){ currentPacmToken = j.pacmtoken; pacmShown = false; renderPacmToken(); rotated = true; }
    else if(j.info){ failInfo = j.info; }
  } catch(e){
    if(e && e.code === 401){ failInfo = 'Key 已失效，请重新进入'; }
    // 其他失败时不阻断，继续刷新会话状态（会显示真实状态）
  } finally {
    $('refreshBtn').disabled = false;
  }
  if(rotated){
    msg.textContent = '已刷新，pacmtoken 已轮换';
    msg.className = 'ok';
  } else {
    msg.textContent = '刷新失败' + (failInfo ? '（' + failInfo + '）' : '，token 可能已失效，请重新登录');
    msg.className = 'error';
  }
  loadSession();
  loadUser();
}
async function doLogout(){
  if(!confirm('确定退出登录吗？这会清除服务端存着的登录态，之后要重新登录。')) return;
  try {
    var j = await api('/migu/passport/logout');
    alert(j && j.success ? '已退出登录' : '退出失败');
  } catch(e){ alert('退出失败'); }
  loadSession();
  loadUser();
}
function songTitle(s){
  var singers = (s.singerList || []).map(function(x){ return x.singerName || x.name || ''; }).filter(Boolean).join(' / ');
  var album = '';
  if(typeof s.album === 'string'){ album = s.album; }
  else if(s.album && s.album.albumName){ album = s.album.albumName; }
  var sec = s.duration || 0;
  if(sec > 10000){ sec = Math.floor(sec / 1000); }
  var dur = sec ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') : '';
  return [s.songName || '', singers, album, dur].filter(Boolean).join(' - ');
}
function selectSong(i){
  selectedSong = songs[i];
  var nodes = $('searchResults').querySelectorAll('.song');
  nodes.forEach(function(n, idx){ if(idx === i){ n.classList.add('sel'); } else { n.classList.remove('sel'); } });
  $('playResult').innerHTML = '';
  $('audioWrap').innerHTML = '';
}
function fmtSize(bytes){
  var b = parseInt(bytes, 10);
  if(!b){ return ''; }
  if(b >= 1048576){ return (b / 1048576).toFixed(1) + 'MB'; }
  return Math.round(b / 1024) + 'KB';
}
function songToneList(s){
  var formats = s.audioFormats || [];
  var list = [];
  formats.forEach(function(f){ if(f.formatType && list.indexOf(f.formatType) < 0){ list.push(f.formatType); } });
  if(!list.length){ list = ['LQ', 'PQ', 'HQ', 'SQ', 'ZQ24', 'ZQ32']; }
  return list;
}
function toneOptions(s){
  var formats = s.audioFormats || [];
  var seen = {};
  var opts = '';
  formats.forEach(function(f){
    var t = f.formatType;
    if(!t || seen[t]){ return; }
    seen[t] = true;
    var label = t;
    var sz = fmtSize(f.isize || f.asize);
    if(sz){ label += ' · ' + sz; }
    opts += '<option value="' + esc(t) + '"' + (t === s.tone ? ' selected' : '') + '>' + esc(label) + '</option>';
  });
  if(!opts){
    ['LQ', 'PQ', 'HQ', 'SQ', 'ZQ24', 'ZQ32'].forEach(function(t){
      opts += '<option value="' + t + '"' + (t === s.tone ? ' selected' : '') + '>' + t + '</option>';
    });
  }
  return opts;
}
async function doSearch(){
  var text = $('searchInput').value.trim();
  if(!text){ $('searchErr').textContent = '请输入歌名'; return; }
  $('searchErr').textContent = '';
  $('searchResults').innerHTML = '<p class="muted">搜索中…</p>';
  try {
    var j = await api('/migu/search?text=' + encodeURIComponent(text));
    var items = (j.data && j.data.items) || [];
    songs = items.slice(0, 10).map(function(it){
      var s = it.song || {};
      var tones = songToneList(s);
      s.tone = tones.indexOf('PQ') >= 0 ? 'PQ' : tones[0];
      return s;
    });
    if(!songs.length){
      $('searchResults').innerHTML = '<p class="muted">没有找到相关歌曲' + (j.info ? '（' + esc(j.info) + '）' : '') + '</p>';
      return;
    }
    var html = '';
    songs.forEach(function(s, i){
      html += '<div class="song" data-i="' + i + '">'
        + '<div class="songTitle">' + esc(songTitle(s)) + '</div>'
        + '<select class="toneSel" data-i="' + i + '">' + toneOptions(s) + '</select>'
        + '<button class="playBtn" data-i="' + i + '">播放</button>'
        + '</div>';
    });
    $('searchResults').innerHTML = html;
    var nodes = $('searchResults').querySelectorAll('.song');
    nodes.forEach(function(n){
      n.addEventListener('click', function(){ selectSong(parseInt(n.getAttribute('data-i'), 10)); });
    });
    var toneSels = $('searchResults').querySelectorAll('.toneSel');
    toneSels.forEach(function(sel){
      sel.addEventListener('change', function(){
        var idx = parseInt(sel.getAttribute('data-i'), 10);
        if(songs[idx]){ songs[idx].tone = sel.value; }
      });
    });
    var playBtns = $('searchResults').querySelectorAll('.playBtn');
    playBtns.forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        playSong(parseInt(btn.getAttribute('data-i'), 10));
      });
    });
    selectSong(0);
  } catch(e){
    $('searchResults').innerHTML = '<p class="error">搜索失败</p>';
  }
}
function dialogText(d){
  if(!d) return '';
  if(typeof d === 'string') return d;
  return d.dialogContent || d.content || d.title || d.message || '';
}
function findUrl(j){
  var d = j.data || {};
  return d.url || (d.data && d.data.url) || j.url || '';
}
function findCannot(j){
  var d = j.data || {};
  return d.cannotCode || j.cannotCode || '';
}
function findDialog(j){
  var d = j.data || {};
  return d.dialogInfo || j.dialogInfo || null;
}
async function playSong(i){
  selectSong(i);
  await getPlayUrl(true);
}
async function getPlayUrl(autoPlay){
  if(!selectedSong){ $('playErr').textContent = '请先搜索并选择一首歌'; return; }
  var ep = $('endpointSel').value;
  var tone = (selectedSong && selectedSong.tone) || 'PQ';
  var s = selectedSong;
  var q = 'contentId=' + encodeURIComponent(s.contentId || '') + '&copyrightId=' + encodeURIComponent(s.copyrightId || '') + '&toneFlag=' + tone + '&resourceType=' + encodeURIComponent(s.resourceType || '2');
  $('playErr').textContent = '';
  $('playResult').innerHTML = '<p class="muted">获取中…</p>';
  $('audioWrap').innerHTML = '';
  try {
    var j = await api('/migu/url/' + ep + '?' + q);
    var cannot = findCannot(j);
    if(cannot){
      var msg = dialogText(findDialog(j));
      $('playResult').innerHTML = '<p class="error">无法播放（cannotCode：' + esc(cannot) + '）' + (msg ? '：' + esc(msg) : '') + '</p>';
      return;
    }
    var url = findUrl(j);
    if(!url){
      $('playResult').innerHTML = '<p class="error">没有拿到播放链接（code：' + esc(j.code || '') + '，' + esc(j.info || '') + '）</p>';
      return;
    }
    var fmt = (j.data && j.data.audioFormatType) || '';
    $('playResult').innerHTML = '<div class="kv"><span>接口</span><span>' + esc(ep) + ' · ' + esc(tone) + '</span></div>'
      + '<div class="kv"><span>格式</span><span>' + esc(fmt || '-') + '</span></div>'
      + '<div class="kv"><span>接口返回 code</span><span>' + esc(j.code || '') + '</span></div>'
      + '<div class="row" style="margin-top:8px;"><input type="text" id="playUrlInput" readonly value="' + esc(url) + '"><button id="copyBtn" class="secondary">复制链接</button></div>';
    $('audioWrap').innerHTML = '<audio controls preload="none" src="' + esc(url) + '"></audio>';
    $('copyBtn').addEventListener('click', copyUrl);
    if(autoPlay){
      var audio = $('audioWrap').querySelector('audio');
      if(audio){ audio.play().catch(function(){}); }
    }
  } catch(e){
    $('playResult').innerHTML = '<p class="error">获取失败</p>';
  }
}
function copyUrl(){
  var v = $('playUrlInput').value;
  function done(ok){
    $('copyBtn').textContent = ok ? '已复制' : '复制失败';
    setTimeout(function(){ $('copyBtn').textContent = '复制链接'; }, 1500);
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(v).then(function(){ done(true); }, function(){ done(false); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = v;
    document.body.appendChild(ta);
    ta.select();
    try { done(document.execCommand('copy')); } catch(e){ done(false); }
    document.body.removeChild(ta);
  }
}
// ---- 网易云 ----
async function loadNeLoginStatus(){
  try {
    var j = await api('/netease/login/status');
    var d = j.data || j;
    var loggedIn = d.code === 200 && (d.account || d.profile);
    var html = '';
    if(loggedIn){
      var acc = d.account || {};
      var prof = d.profile || {};
      html = '<div class="kv"><span>状态</span><span class="pill ok">已登录</span></div>'
        + '<div class="kv"><span>用户 ID</span><span>' + esc(acc.id || prof.userId || '-') + '</span></div>'
        + '<div class="kv"><span>昵称</span><span>' + esc(prof.nickname || acc.userName || '-') + '</span></div>';
    } else {
      html = '<div class="kv"><span>状态</span><span class="pill err">未登录</span></div>'
        + '<p class="muted">未登录时搜索、取链、歌词仍可用；登录后可用会员相关接口。</p>';
    }
    $('neLoginBody').innerHTML = html;
  } catch(e){
    $('neLoginBody').innerHTML = '<p class="error">加载失败</p>';
  }
}
async function doNeLogout(){
  if(!confirm('确定退出网易云登录吗？')) return;
  try {
    var j = await api('/netease/logout');
    alert(j && j.code === 200 ? '已退出登录' : '退出失败');
  } catch(e){ alert('退出失败'); }
  loadNeLoginStatus();
}
function neSongTitle(s){
  var artists = (s.artists || s.ar || []).map(function(a){ return a.name || ''; }).filter(Boolean).join(' / ');
  var album = (s.album && s.album.name) || (s.al && s.al.name) || '';
  var ms = s.duration || s.dt || 0;
  var sec = ms > 10000 ? Math.floor(ms / 1000) : ms;
  var dur = sec ? Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0') : '';
  return [s.name || '', artists, album, dur].filter(Boolean).join(' - ');
}
function neSelectSong(i){
  neSelectedSong = neSongs[i];
  var nodes = $('neSearchResults').querySelectorAll('.song');
  nodes.forEach(function(n, idx){ if(idx === i){ n.classList.add('sel'); } else { n.classList.remove('sel'); } });
  $('nePlayResult').innerHTML = '';
  $('neAudioWrap').innerHTML = '';
  $('neLyricWrap').innerHTML = '';
}
async function doNeSearch(){
  var text = $('neSearchInput').value.trim();
  if(!text){ $('neSearchErr').textContent = '请输入歌名'; return; }
  $('neSearchErr').textContent = '';
  $('neSearchResults').innerHTML = '<p class="muted">搜索中…</p>';
  try {
    var j = await api('/netease/search?keywords=' + encodeURIComponent(text) + '&limit=10');
    var items = (j.result && j.result.songs) || [];
    neSongs = items;
    if(!neSongs.length){
      $('neSearchResults').innerHTML = '<p class="muted">没有找到相关歌曲</p>';
      return;
    }
    var html = '';
    neSongs.forEach(function(s, i){
      html += '<div class="song" data-i="' + i + '">'
        + '<div class="songTitle">' + esc(neSongTitle(s)) + '</div>'
        + '<button class="playBtn" data-i="' + i + '">播放</button>'
        + '</div>';
    });
    $('neSearchResults').innerHTML = html;
    var nodes = $('neSearchResults').querySelectorAll('.song');
    nodes.forEach(function(n){
      n.addEventListener('click', function(){ neSelectSong(parseInt(n.getAttribute('data-i'), 10)); });
    });
    var playBtns = $('neSearchResults').querySelectorAll('.playBtn');
    playBtns.forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        neSelectSong(parseInt(btn.getAttribute('data-i'), 10));
        getNePlayUrl(true);
      });
    });
    neSelectSong(0);
  } catch(e){
    $('neSearchResults').innerHTML = '<p class="error">搜索失败</p>';
  }
}
async function getNePlayUrl(autoPlay){
  if(!neSelectedSong){ $('nePlayErr').textContent = '请先搜索并选择一首歌'; return; }
  var ep = $('neEndpointSel').value;
  var level = $('neLevelSel').value;
  var id = neSelectedSong.id;
  var q = 'id=' + encodeURIComponent(id);
  if(ep === 'url/v1'){ q += '&level=' + encodeURIComponent(level); }
  $('nePlayErr').textContent = '';
  $('nePlayResult').innerHTML = '<p class="muted">获取中…</p>';
  $('neAudioWrap').innerHTML = '';
  try {
    var j = await api('/netease/song/' + ep + '?' + q);
    var d = (j.data && j.data[0]) || null;
    if(!d || !d.url){
      $('nePlayResult').innerHTML = '<p class="error">没有拿到播放链接（code：' + esc(d && d.code !== undefined ? d.code : (j.code || '')) + '，该歌可能无版权或需会员）</p>';
      return;
    }
    var br = d.br ? Math.round(d.br / 1000) + 'kbps' : '-';
    $('nePlayResult').innerHTML = '<div class="kv"><span>接口</span><span>song/' + esc(ep) + (ep === 'url/v1' ? ' · ' + esc(level) : '') + '</span></div>'
      + '<div class="kv"><span>码率</span><span>' + esc(br) + '</span></div>'
      + '<div class="kv"><span>格式</span><span>' + esc(d.type || '-') + '</span></div>'
      + '<div class="row" style="margin-top:8px;"><input type="text" id="nePlayUrlInput" readonly value="' + esc(d.url) + '"><button id="neCopyBtn" class="secondary">复制链接</button></div>';
    $('neAudioWrap').innerHTML = '<audio controls preload="none" src="' + esc(d.url) + '"></audio>';
    $('neCopyBtn').addEventListener('click', function(){
      var v = $('nePlayUrlInput').value;
      function done(ok){
        $('neCopyBtn').textContent = ok ? '已复制' : '复制失败';
        setTimeout(function(){ $('neCopyBtn').textContent = '复制链接'; }, 1500);
      }
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(v).then(function(){ done(true); }, function(){ done(false); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = v;
        document.body.appendChild(ta);
        ta.select();
        try { done(document.execCommand('copy')); } catch(e){ done(false); }
        document.body.removeChild(ta);
      }
    });
    if(autoPlay){
      var audio = $('neAudioWrap').querySelector('audio');
      if(audio){ audio.play().catch(function(){}); }
    }
  } catch(e){
    $('nePlayResult').innerHTML = '<p class="error">获取失败</p>';
  }
}
async function getNeLyric(){
  if(!neSelectedSong){ $('nePlayErr').textContent = '请先搜索并选择一首歌'; return; }
  $('nePlayErr').textContent = '';
  $('neLyricWrap').innerHTML = '<p class="muted">获取歌词中…</p>';
  try {
    var j = await api('/netease/lyric?id=' + encodeURIComponent(neSelectedSong.id));
    var lyric = (j.lrc && j.lrc.lyric) || '';
    if(!lyric){
      $('neLyricWrap').innerHTML = '<p class="muted">暂无歌词</p>';
      return;
    }
    $('neLyricWrap').innerHTML = '<div class="lyricBox">' + esc(lyric) + '</div>';
  } catch(e){
    $('neLyricWrap').innerHTML = '<p class="error">获取歌词失败</p>';
  }
}
async function loadNeStatus(){
  try {
    var j = await api('/netease/status');
    $('neStatusBody').innerHTML = '<div class="kv"><span>版本</span><span>' + esc(j.version || '-') + '</span></div>'
      + '<div class="kv"><span>运行环境</span><span>' + esc(j.runtime || '-') + '</span></div>';
  } catch(e){
    $('neStatusBody').innerHTML = '<p class="error">加载失败</p>';
  }
}
$('enterBtn').addEventListener('click', enterKey);
$('keyInput').addEventListener('keydown', function(e){ if(e.key === 'Enter'){ enterKey(); } });
$('togglePacmBtn').addEventListener('click', togglePacm);
$('copyPacmBtn').addEventListener('click', copyPacm);
$('rememberKey').checked = !!lsGet('migu_admin_key');
$('searchBtn').addEventListener('click', doSearch);
$('searchInput').addEventListener('keydown', function(e){ if(e.key === 'Enter'){ doSearch(); } });
$('getUrlBtn').addEventListener('click', function(){ getPlayUrl(false); });
$('refreshBtn').addEventListener('click', doRefresh);
$('logoutBtn').addEventListener('click', doLogout);
$('exitBtn').addEventListener('click', exitAdmin);
$('neLogoutBtn').addEventListener('click', doNeLogout);
$('neSearchBtn').addEventListener('click', doNeSearch);
$('neSearchInput').addEventListener('keydown', function(e){ if(e.key === 'Enter'){ doNeSearch(); } });
$('neGetUrlBtn').addEventListener('click', function(){ getNePlayUrl(false); });
$('neGetLyricBtn').addEventListener('click', getNeLyric);
if(apiKey){
  api('/migu/passport/refresh').then(function(){ showDash(); loadAll(); }).catch(function(){ showGate(''); });
} else {
  showGate('');
}
</script>
</body>
</html>
`;
