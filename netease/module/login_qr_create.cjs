// Edge 改造：`qrcode` npm 包依赖 Node fs + pngjs（边缘上不可用），
// 改用 vendored 的纯 JS 生成器（netease/vendor/qrcode-generator.cjs）。
// 行为差异：qrimg 由 PNG data URL 改为 SVG data URL（<img> 可直接显示）。
const QRCode = require('../vendor/qrcode-generator.cjs')
const { generateChainId, getCookieHeader, hasCookie } = require('../util/index.cjs')

// 无 Buffer：TextEncoder + btoa 做 UTF-8 → base64
function svgToDataURL(svg) {
  const bytes = new TextEncoder().encode(svg)
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return 'data:image/svg+xml;base64,' + btoa(bin)
}

module.exports = (query) => {
  return new Promise(async (resolve) => {
    const platform = query.platform || 'pc'
    const headerCookie = getCookieHeader(query.headers)
    const cookie = hasCookie(query.cookie)
      ? query.cookie
      : hasCookie(headerCookie)
        ? headerCookie
        : ''

    // 构建基础URL
    let url = `https://music.163.com/login?codekey=${query.key}`

    // 如果是web平台，则添加chainId参数

    if (platform === 'web') {
      const chainId = generateChainId(cookie)
      url += `&chainId=${chainId}`
    }

    let qrimg = ''
    if (query.qrimg) {
      const qr = QRCode(0, 'M')
      qr.addData(url)
      qr.make()
      qrimg = svgToDataURL(qr.createSvgTag(4, 4))
    }

    return resolve({
      code: 200,
      status: 200,
      body: {
        code: 200,
        data: {
          qrurl: url,
          qrimg: qrimg,
        },
      },
    })
  })
}
