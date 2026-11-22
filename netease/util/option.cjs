const { getCookieHeader, hasCookie } = require('./index.cjs')

const createOption = (query, crypto = '', checkToken = false) => {
  const headerCookie = getCookieHeader(query.headers)

  return {
    crypto: query.crypto || crypto || '',
    cookie: hasCookie(query.cookie)
      ? query.cookie
      : hasCookie(headerCookie)
        ? headerCookie
        : process.env.NETEASE_COOKIE,
    ua: query.ua || '',
    proxy: query.proxy,
    realIP: query.realIP,
    randomCNIP:
      process.env.ENABLE_RANDOM_CN_IP === 'true'
        ? !['false', false].includes(query.randomCNIP)
        : ['true', true].includes(query.randomCNIP),
    e_r: query.e_r || undefined,
    domain: query.domain || '',
    checkToken: query.checkToken || checkToken,
    headers: query.headers || {},
    // 边缘默认超时 30s：原版默认 0（无超时），边缘上一次上游停顿会把
    // 函数无限挂住；显式传 query.timeout 仍可覆盖。
    timeout: query.timeout || 30000,
  }
}
module.exports = createOption
