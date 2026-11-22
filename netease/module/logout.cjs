// 退出登录

const createOption = require('../util/option.cjs')
module.exports = (query, request) => {
  return request(`/api/logout`, {}, createOption(query))
}
