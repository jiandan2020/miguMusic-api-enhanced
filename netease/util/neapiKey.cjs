// neapi 配置存取（EdgeOne 边缘函数版）
//
// 原版存在 os.tmpdir() 的文件里；边缘函数没有文件系统，改存内存。
// 注意：neapi 加密本身在 crypto.cjs 里已明确抛错（ChaCha20-Poly1305 无
// Web Crypto 实现），且没有任何模块使用 neapi，所以这里永远返回 null，
// 只是保留接口形状，让 request.cjs 的 neapi 分支报出明确的错误。
let neapi_key = null

const loadNeapiKey = () => {
  return neapi_key
}

const saveNeapiKey = (config, circleTime) => {
  const fetchedAt = Date.now()
  neapi_key = { ...config, circleTime, fetchedAt }
  return neapi_key
}

module.exports = {
  loadNeapiKey,
  saveNeapiKey,
}
