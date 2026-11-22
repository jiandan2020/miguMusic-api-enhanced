// 歌曲链接
const createOption = require('../util/option.cjs')

// v1 用 level（standard/higher/exhigh/lossless/hires/...），v2 原版只认
// br（码率数字），传 level 会被直接忽略。EdgeOne 版让 v2 也认 level，
// 按档位换算成 br；同时传了 br 时 br 优先；都不传保持默认 999000。
const LEVEL_TO_BR = {
  standard: 128000,
  higher: 192000,
  exhigh: 320000,
  lossless: 999000,
  hires: 999000,
  jyeffect: 999000,
  sky: 999000,
  jymaster: 999000,
  vivid: 999000,
}

function resolveBr(query) {
  if (query.br !== undefined && query.br !== '' && query.br !== null) {
    const br = parseInt(query.br, 10)
    if (Number.isFinite(br) && br > 0) return br
  }
  if (typeof query.level === 'string' && query.level) {
    const mapped = LEVEL_TO_BR[query.level.toLowerCase()]
    if (mapped) return mapped
  }
  return 999000
}

module.exports = async (query, request) => {
  const ids = String(query.id).split(',')
  const data = {
    ids: JSON.stringify(ids),
    br: resolveBr(query),
  }
  const res = await request(
    `/api/song/enhance/player/url`,
    data,
    createOption(query),
  )
  // 根据id排序
  const result = res.body.data
  result.sort((a, b) => {
    return ids.indexOf(String(a.id)) - ids.indexOf(String(b.id))
  })
  return {
    status: 200,
    body: {
      code: 200,
      data: result,
    },
  }
}
