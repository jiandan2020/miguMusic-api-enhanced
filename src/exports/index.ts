/**
 * modules 子目录统一入口
 * 汇总导出所有 API 函数
 */
export { searchSong } from '../modules/search';
export { getSearchHot } from '../modules/search_hot';
export { getResourceInfo } from '../modules/resourceinfo';
export { getUrlV1 } from '../modules/url_v1';
export { getUrlV2 } from '../modules/url_v2';
export { getUrlH5V24 } from '../modules/url_h5v2.4';
export { getDLUrlV1 } from '../modules/url_dl_v1';
export { getVersion } from '../modules/version';
export { checkToken } from '../modules/passport_checkToken';
export { getPacmToken } from '../modules/passport_pacmToken';
export { logout } from '../modules/passport_logout';
export { queryUserInfo } from '../modules/user_queryInfo';
export { getUserPhoneInfo } from '../modules/user_phoneInfo';
export { getLyric } from '../modules/lyric';
export { getSongInfoByContentIds, getSongInfoBySongIds } from '../modules/song_info';
export { getSongIds } from '../modules/song_ids';
