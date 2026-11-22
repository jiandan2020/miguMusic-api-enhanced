/**
 * /miguadmin 管理页面（单文件 HTML，内联 CSS/JS，无外部依赖）。
 *
 * - 页面本身公开（见 src/middleware/auth.ts 的 PUBLIC_PATHS），否则没 Key
 *   会直接返回 401 JSON、连输入框都看不到；真正的数据请求都要带 Key，
 *   没通过校验什么都看不到、也调不动。
 * - Key 只存在 sessionStorage（关标签页即清除），不写进页面、不写 cookie。
 * - 所有数据都用 KV 里存着的 pacmtoken，不用再传 pacmtoken 参数。
 * - 会员等级取自 /migu/user/info 的 userMemberInfos 与 userLevelInfo；
 *   播放测试可自选接口（v1 / v2 / h5v2.4）与音质（toneFlag）。
 */
export const adminPageHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>咪咕 API 管理</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f6f7f9; color: #1f2937; }
header { background: #4f46e5; color: #fff; padding: 18px 16px; }
header h1 { margin: 0; font-size: 20px; }
header p { margin: 4px 0 0; font-size: 13px; opacity: .85; }
main { max-width: 720px; margin: 0 auto; padding: 16px; }
.card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.card h2 { margin: 0 0 12px; font-size: 17px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
input[type=text], input[type=password], select { font-size: 15px; padding: 9px 12px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; color: #1f2937; }
input[type=text], input[type=password] { flex: 1; min-width: 0; }
button { font-size: 15px; padding: 9px 16px; border-radius: 8px; border: none; background: #4f46e5; color: #fff; cursor: pointer; }
button:disabled { opacity: .6; cursor: default; }
button.secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; }
.muted { color: #6b7280; font-size: 13px; }
.error { color: #dc2626; font-size: 14px; }
.ok { color: #059669; }
.kv { display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
.kv:last-child { border-bottom: none; }
.kv span:first-child { color: #6b7280; flex: none; }
.kv span:last-child { text-align: right; word-break: break-all; }
.song { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; cursor: pointer; font-size: 14px; }
.song.sel { border-color: #4f46e5; background: #eef2ff; }
.songTitle { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toneSel { flex: none; max-width: 132px; font-size: 14px; padding: 7px 8px; }
.playBtn { flex: none; padding: 7px 12px; }
.avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
.member { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 14px; }
.member img { width: 36px; height: 36px; border-radius: 8px; object-fit: contain; }
audio { width: 100%; margin-top: 10px; }
</style>
</head>
<body>
<header>
<h1>咪咕 API 管理</h1>
<p>migu.api.xzccs.top · 仅自己使用</p>
</header>
<main>
<section class="card" id="gate">
<h2>输入 Key 进入</h2>
<p class="muted">Key 与 EdgeOne 控制台的 API_KEY 一致，只保存在当前标签页，关闭即清除。</p>
<div class="row">
<input type="password" id="keyInput" placeholder="API Key" autocomplete="off">
<button id="enterBtn">进入</button>
</div>
<label style="display:flex; gap:6px; align-items:center; margin-top:10px; font-size:14px; cursor:pointer;"><input type="checkbox" id="rememberKey"> 记住 Key（保存在当前浏览器，下次打开不用再输）</label>
<p class="error" id="gateErr"></p>
</section>
<div id="dash" hidden>
<section class="card">
<h2>会话状态</h2>
<div id="sessionBody"><p class="muted">加载中…</p></div>
<div style="margin-top:12px;">
<div class="muted" style="margin-bottom:4px;">pacmtoken</div>
<div id="pacmTokenVal" style="word-break:break-all; font-size:13px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px;">加载中…</div>
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
</div>
</main>
<script>
function $(id){ return document.getElementById(id); }
function lsGet(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); } catch(e){} }
function lsDel(k){ try { localStorage.removeItem(k); } catch(e){} }
var apiKey = lsGet('migu_admin_key') || sessionStorage.getItem('migu_admin_key') || '';
var selectedSong = null;
var songs = [];
var currentPacmToken = '';
var pacmShown = false;

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
function statusClass(s){ return (s === 'alive' || s === 'refreshed') ? 'ok' : 'error'; }
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
function loadAll(){ loadSession(); loadUser(); loadStatus(); }
async function doRefresh(){
  // 用 /user/info/phone 主动轮换 pacmtoken（返回新 token 并写回 KV），
  // 再刷新会话状态与用户信息；token 已死时换不到，会照实显示 session_dead。
  $('refreshBtn').disabled = true;
  try {
    var j = await api('/migu/user/info/phone');
    if(j.pacmtoken){ currentPacmToken = j.pacmtoken; pacmShown = false; renderPacmToken(); }
  } catch(e){
    // 失败时不阻断，继续刷新会话状态（会显示真实状态）
  } finally {
    $('refreshBtn').disabled = false;
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
if(apiKey){
  api('/migu/passport/refresh').then(function(){ showDash(); loadAll(); }).catch(function(){ showGate(''); });
} else {
  showGate('');
}
</script>
</body>
</html>
`;
