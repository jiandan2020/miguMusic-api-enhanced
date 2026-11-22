// 热门搜索

const createOption = require('../util/option.cjs')
module.exports = (query, request) => {
  const data = {
    type: 1111,
  }
  return request(`/api/search/hot`, data, createOption(query))
}
