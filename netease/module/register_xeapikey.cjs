// axios -> fetch（EdgeOne 边缘函数版）：直接调网易取 xeapi 公钥的接口。
const encrypt = require('../util/crypto.cjs')
const { APP_CONF } = require('../util/config.json')

const generateNonce = () => {
  let nonce = ''
  for (let i = 0; i < 16; i++) {
    nonce += Math.floor(Math.random() * 10).toString()
  }
  return nonce
}

module.exports = async (query, request) => {
  const nonce = generateNonce()
  const timestamp = String(Date.now())
  const deviceId = query.deviceId || globalThis.deviceId || ''
  const currentKeyVersion = query.currentKeyVersion || ''

  const data = {
    appVersion: '9.5.61',
    currentKeyVersion,
    deviceId,
    nonce,
    os: 'android',
    requestType: 'active',
    signature: encrypt.xeapiSign(timestamp, nonce),
    t1: '',
    t2: '',
    timestamp,
    uid: '',
  }

  const res = await fetch(APP_CONF.apiDomain + '/api/bsr/sk/get', {
    method: 'POST',
    headers: {
      'User-Agent':
        'NeteaseMusic/9.5.61.260802021928(9005061);Dalvik/2.1.0 (Linux; U; Android 12; HBN-AL00 Build/cd737a2.0)',
      Cookie: deviceId ? `deviceId=${encodeURIComponent(deviceId)}` : '',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(data).toString(),
  })
  const resData = await res.json()

  if (
    !resData ||
    resData.code !== 200 ||
    !resData.data ||
    !resData.data.encryptedData
  ) {
    throw new Error('xeapi public key request failed')
  }
  if (
    !resData.data.signature ||
    encrypt.xeapiSign(resData.data.timestamp, nonce) !==
      resData.data.signature
  ) {
    throw new Error('xeapi public key response signature mismatch')
  }

  const publicKey = encrypt.xeapiDecryptPublicKey(resData.data.encryptedData)
  if (!publicKey.sk) {
    throw new Error('xeapi public key response missing sk')
  }

  return {
    status: 200,
    body: {
      ...publicKey,
      deviceId,
    },
    cookie: [],
  }
}
