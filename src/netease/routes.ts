// @ts-nocheck
// 自动生成：node scripts/generate-netease-routes.mjs（不要手改）。
// 来源：netease/module/*.cjs（enhanced fork v4.41.1），按原版 server.js
// 的规则映射路由；只注册 KEEP 白名单里的 18 个模块（19 个保留接口
// 里 /netease/status 不走模块，在 app.ts 里直接返回）。

import mod_login_cellphone from '../../netease/module/login_cellphone.cjs';
import mod_login_qr_check from '../../netease/module/login_qr_check.cjs';
import mod_login_qr_create from '../../netease/module/login_qr_create.cjs';
import mod_login_qr_key from '../../netease/module/login_qr_key.cjs';
import mod_login_refresh from '../../netease/module/login_refresh.cjs';
import mod_login_status from '../../netease/module/login_status.cjs';
import mod_logout from '../../netease/module/logout.cjs';
import mod_lyric from '../../netease/module/lyric.cjs';
import mod_search from '../../netease/module/search.cjs';
import mod_search_hot from '../../netease/module/search_hot.cjs';
import mod_search_hot_detail from '../../netease/module/search_hot_detail.cjs';
import mod_song_detail from '../../netease/module/song_detail.cjs';
import mod_song_download_url from '../../netease/module/song_download_url.cjs';
import mod_song_url from '../../netease/module/song_url.cjs';
import mod_song_url_v1 from '../../netease/module/song_url_v1.cjs';
import mod_user_account from '../../netease/module/user_account.cjs';
import mod_user_detail from '../../netease/module/user_detail.cjs';
import mod_user_level from '../../netease/module/user_level.cjs';

export interface NeteaseModule {
  (query: any, request: any): Promise<any>;
}

export const neteaseRoutes: Array<{ route: string; module: NeteaseModule }> = [
  { route: '/login/cellphone', module: mod_login_cellphone },
  { route: '/login/qr/check', module: mod_login_qr_check },
  { route: '/login/qr/create', module: mod_login_qr_create },
  { route: '/login/qr/key', module: mod_login_qr_key },
  { route: '/login/refresh', module: mod_login_refresh },
  { route: '/login/status', module: mod_login_status },
  { route: '/logout', module: mod_logout },
  { route: '/lyric', module: mod_lyric },
  { route: '/search', module: mod_search },
  { route: '/search/hot', module: mod_search_hot },
  { route: '/search/hot/detail', module: mod_search_hot_detail },
  { route: '/song/detail', module: mod_song_detail },
  { route: '/song/download/url', module: mod_song_download_url },
  { route: '/song/url', module: mod_song_url },
  { route: '/song/url/v1', module: mod_song_url_v1 },
  { route: '/user/account', module: mod_user_account },
  { route: '/user/detail', module: mod_user_detail },
  { route: '/user/level', module: mod_user_level },
];

export const neteaseExcluded: Array<{ file: string; reason: string }> = [
  { file: 'register_anonimous.cjs', reason: '内部：configRefresh 拉匿名 token（MUSIC_A）' },
  { file: 'register_xeapikey.cjs', reason: '内部：configRefresh 拉 xeapi 公钥' },
];
