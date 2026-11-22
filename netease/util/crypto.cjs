// 网易云加密（EdgeOne 边缘函数版）
//
// 原版 util/crypto.js 用 Node 内置模块（crypto / zlib / zstd + node-forge），
// 边缘函数是 V8 运行时、没有这些模块，全部换成纯 JS / Web Crypto：
// - AES（CBC/ECB）与 MD5/HMAC：crypto-js（纯 JS，已是依赖）
// - RSA（weapi）：BigInt 原生 RSA（无填充），n/e 已从公钥 PEM 提取并硬编码，
//   本地已用 Node crypto.publicEncrypt(RSA_NO_PADDING) 逐字节验证一致
// - X25519（xeapi）：BigInt 蒙哥马利梯（RFC 7748），本地用 Node diffieHellman 验证
// - AES-128-GCM（xeapi）：Web Crypto subtle.encrypt（异步），xeapi() 因此改为 async
// - gunzip：pako（纯 JS，已是本仓库 devDependency）
// - neapi（ChaCha20-Poly1305）：Web Crypto 不支持，0 个模块使用，改为明确抛错
// - 不用 Buffer：全部用 Uint8Array + TextEncoder/TextDecoder（Web 标准，
//   边缘运行时一定有；Buffer 在 EdgeOne 上不保证存在）
//
// 对外导出与原版一致（weapi/linuxapi/eapi/xeapi/neapi/decrypt/aesEncrypt/
// aesDecrypt/eapiReqDecrypt/eapiResDecrypt/xeapiSign/xeapiResDecrypt/
// xeapiDecryptPublicKey/neapiResDecrypt），模块层不用改。
// 唯一差别：xeapi() 现在是 async，调用方（util/request.js）要 await。
const CryptoJS = require('crypto-js')
const pako = require('pako')
const iv = '0102030405060708'
const presetKey = '0CoJUm6Qyw8W8jud'
const linuxapiKey = 'rFgB&h#%2?^eDg:Q'
const base62 = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const publicKey = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`
const eapiKey = 'e82ckenh8dichen8'
const xeapiStaticKey = hexToBytes(
  'ab1d5a430f6bb04a3f01e81ddd72bd916d5ce591248ac128714806d7f8fb1b84',
)
const xeapiSignKey =
  'mUHCwVNWJbunMqAHf5MImuirT6plvs6VSFW62MGHstFQxhBGdEoIhLItH3djc4+FB/OKty3+lL2rGeoFBpVe5g=='
// weapi RSA 公钥参数（从上面 PEM 提取，n 为 1024 位，e = 65537；
// 已用 Node crypto.publicEncrypt(RSA_NO_PADDING) 验证逐字节一致）
const rsaModulusHex =
  'e0b509f6259df8642dbc35662901477df22677ec152b5ff68ace615bb7b725152b3ab17a876aea8a5aa76d2e417629ec4ee341f56135fccf695280104e0312ecbda92557c93870114af6c9d05c4f7f0c3685b7a46bee255932575cce10b424d813cfe4875d3e82047b97ddef52741d546b8e289dc6935b3ece0462db0a22b8e7'
const rsaExponent = 65537n
const rsaModulus = BigInt('0x' + rsaModulusHex)

// ---------- 字节工具（Uint8Array） ----------
const te = new TextEncoder()
const td = new TextDecoder()
function utf8ToBytes(s) {
  return te.encode(s)
}
function bytesToUtf8(b) {
  return td.decode(b)
}
function bytesToHex(b) {
  let s = ''
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0')
  return s
}
function hexToBytes(h) {
  const b = new Uint8Array(h.length / 2)
  for (let i = 0; i < b.length; i++) b[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16)
  return b
}
function bytesToBase64(b) {
  let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s)
}
function base64ToBytes(s) {
  const bin = atob(s)
  const b = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i)
  return b
}
function bytesToBase64url(b) {
  return bytesToBase64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function concatBytes(...parts) {
  let len = 0
  for (const p of parts) len += p.length
  const out = new Uint8Array(len)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}
function randomBytes(n) {
  const b = new Uint8Array(n)
  crypto.getRandomValues(b)
  return b
}
// CryptoJS WordArray <-> Uint8Array
function waToBytes(wa) {
  const bytes = new Uint8Array(wa.sigBytes)
  const words = wa.words
  for (let i = 0; i < wa.sigBytes; i++) {
    bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff
  }
  return bytes
}
function bytesToWa(b) {
  // 注意：CryptoJS.lib.WordArray.create(Uint8Array) 不会按字节正确打包，
  // 它会把字节长度当成字数（sigBytes = length*4），导致解密出错。
  // 必须手动按大端把字节拼成 32 位字，并把真实字节数传给 sigBytes。
  const words = []
  for (let i = 0; i < b.length; i += 4) {
    words.push(
      (((b[i] || 0) << 24) |
        ((b[i + 1] || 0) << 16) |
        ((b[i + 2] || 0) << 8) |
        (b[i + 3] || 0)) >>>
        0,
    )
  }
  return CryptoJS.lib.WordArray.create(words, b.length)
}
function modPow(base, exp, mod) {
  let result = 1n
  let b = base % mod
  let e = exp
  while (e > 0n) {
    if (e & 1n) result = (result * b) % mod
    b = (b * b) % mod
    e >>= 1n
  }
  return result
}

// ---------- AES（crypto-js，与原版一致） ----------
const aesEncrypt = (text, mode, key, iv, format = 'base64') => {
  let encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(text),
    CryptoJS.enc.Utf8.parse(key),
    {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode[mode.toUpperCase()],
      padding: CryptoJS.pad.Pkcs7,
    },
  )
  if (format === 'base64') {
    return encrypted.toString()
  }
  return encrypted.ciphertext.toString().toUpperCase()
}
const aesDecrypt = (ciphertext, mode, key, iv, format = 'base64') => {
  let bytes
  if (format === 'base64') {
    bytes = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Utf8.parse(key), {
      iv: CryptoJS.enc.Utf8.parse(iv),
      mode: CryptoJS.mode[mode.toUpperCase()],
      padding: CryptoJS.pad.Pkcs7,
    })
  } else {
    bytes = CryptoJS.AES.decrypt(
      { ciphertext: CryptoJS.enc.Hex.parse(ciphertext) },
      CryptoJS.enc.Utf8.parse(key),
      {
        iv: CryptoJS.enc.Utf8.parse(iv),
        mode: CryptoJS.mode[mode.toUpperCase()],
        padding: CryptoJS.pad.Pkcs7,
      },
    )
  }
  return bytes
}
// AES-ECB（原版用 Node crypto.createCipheriv；crypto-js 同样支持 ECB + Pkcs7，
// 输入输出改用 Uint8Array；key 可能是字符串或 Uint8Array，先归一化）
const toBytes = (v) => (v instanceof Uint8Array ? v : utf8ToBytes(String(v)))
const aesEcbEncrypt = (key, plaintext) => {
  const pt = toBytes(plaintext)
  const encrypted = CryptoJS.AES.encrypt(bytesToWa(pt), bytesToWa(toBytes(key)), {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  })
  return waToBytes(encrypted.ciphertext)
}
const aesEcbDecrypt = (key, ciphertext) => {
  const ct = ciphertext instanceof Uint8Array ? ciphertext : hexToBytes(String(ciphertext))
  const decrypted = CryptoJS.AES.decrypt(
    { ciphertext: bytesToWa(ct) },
    bytesToWa(toBytes(key)),
    { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 },
  )
  return waToBytes(decrypted)
}
// HMAC-SHA256（原版用 Node crypto.createHmac；crypto-js 等价，同步）
const hmacSha256Base64 = (key, message) => {
  return CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64)
}
// RSA 无填充加密（原版用 node-forge 的 encrypt(str, 'NONE')，即教科书 RSA；
// 用 BigInt 实现，输出 256 位十六进制小写，与原版一致）
const rsaEncrypt = (str, _key) => {
  const m = BigInt('0x' + bytesToHex(utf8ToBytes(str)))
  const c = modPow(m, rsaExponent, rsaModulus)
  return c.toString(16).padStart(256, '0')
}

// ---------- X25519（RFC 7748，BigInt 蒙哥马利梯） ----------
const X25519_P = (1n << 255n) - 19n
const X25519_A24 = 121665n
function x25519Ladder(k, u) {
  let x1 = u
  let x2 = 1n
  let z2 = 0n
  let x3 = u
  let z3 = 1n
  let swap = 0n
  for (let t = 254; t >= 0; t--) {
    const kt = (k >> BigInt(t)) & 1n
    swap ^= kt
    if (swap) {
      ;[x2, x3] = [x3, x2]
      ;[z2, z3] = [z3, z2]
    }
    swap = kt
    const A = (x2 + z2) % X25519_P
    const AA = (A * A) % X25519_P
    const B = (x2 - z2 + X25519_P) % X25519_P
    const BB = (B * B) % X25519_P
    const E = (AA - BB + X25519_P) % X25519_P
    const C = (x3 + z3) % X25519_P
    const D = (x3 - z3 + X25519_P) % X25519_P
    const DA = (D * A) % X25519_P
    const CB = (C * B) % X25519_P
    x3 = (((DA + CB) % X25519_P) ** 2n) % X25519_P
    z3 = (x1 * (((DA - CB + X25519_P) % X25519_P) ** 2n)) % X25519_P
    x2 = (AA * BB) % X25519_P
    z2 = (E * ((AA + X25519_A24 * E) % X25519_P)) % X25519_P
  }
  if (swap) {
    ;[x2, x3] = [x3, x2]
    ;[z2, z3] = [z3, z2]
  }
  return (x2 * modPow(z2, X25519_P - 2n, X25519_P)) % X25519_P
}
function decodeU(uBytes) {
  const b = new Uint8Array(uBytes)
  b[31] &= 0x7f
  let u = 0n
  for (let i = 31; i >= 0; i--) u = (u << 8n) | BigInt(b[i])
  return u
}
function decodeScalar(kBytes) {
  const b = new Uint8Array(kBytes)
  b[0] &= 248
  b[31] &= 127
  b[31] |= 64
  let k = 0n
  for (let i = 31; i >= 0; i--) k = (k << 8n) | BigInt(b[i])
  return k
}
function encodeU(u) {
  const b = new Uint8Array(32)
  let v = u
  for (let i = 0; i < 32; i++) {
    b[i] = Number(v & 0xffn)
    v >>= 8n
  }
  return b
}
// X25519 ECDH：secret(32 字节) 与 peer 公钥原文(32 字节) -> 共享密钥(32 字节)
const x25519 = (secret, peerRaw) => {
  return encodeU(x25519Ladder(decodeScalar(secret), decodeU(peerRaw)))
}
// X25519 公钥：secret(32 字节) -> 公钥原文(32 字节)
const x25519Base = (secret) => {
  const base = new Uint8Array(32)
  base[0] = 9
  return encodeU(x25519Ladder(decodeScalar(secret), decodeU(base)))
}

const deriveX25519AesKey = (sharedSecret, ephemeralPublicKey) => {
  const prk = CryptoJS.HmacSHA256(
    bytesToWa(sharedSecret.length ? sharedSecret : new Uint8Array(32)),
    bytesToWa(new Uint8Array(32)),
  )
  const derived = CryptoJS.HmacSHA256(
    bytesToWa(concatBytes(ephemeralPublicKey, new Uint8Array([1]))),
    prk,
  )
  return waToBytes(derived).subarray(0, 16)
}

const xeapiSign = (timestamp, nonce) => {
  return hmacSha256Base64(xeapiSignKey, String(timestamp) + nonce)
}

const xeapiMidTransform = (ciphertext) => {
  const random = randomBytes(16)
  const xored = new Uint8Array(ciphertext.length)
  for (let i = 0; i < ciphertext.length; i++) {
    xored[i] = ciphertext[i] ^ random[i & 0x0f]
  }
  const rot = xored.length ? (random[0] & 0x0f) % xored.length : 0
  return concatBytes(random, xored.subarray(rot), xored.subarray(0, rot))
}

const isUtf8 = (buf) => {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf)
    return true
  } catch {
    return false
  }
}

// AES-128-GCM（Web Crypto，异步；输出 = 密文 + 16 字节 tag，与 Node 拼接顺序一致）
async function aes128GcmEncrypt(key, iv, plaintext) {
  const ck = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt'])
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, ck, plaintext)
  return new Uint8Array(ct)
}

const xeapiEncryptS = async (dynamicKey, publicKeyState, os) => {
  const peerRaw = base64ToBytes(publicKeyState.publicKey)
  // 临时密钥对：私钥随机，公钥 = X25519(secret, base)
  const secret = randomBytes(32)
  const ephemeralRaw = x25519Base(secret)
  const sharedSecret = x25519(secret, peerRaw)
  const aesKey = deriveX25519AesKey(sharedSecret, ephemeralRaw)
  const iv = randomBytes(12)
  const plaintext = utf8ToBytes(
    `${bytesToBase64(dynamicKey)}|${os}|${publicKeyState.sk || ''}`,
  )
  const encrypted = await aes128GcmEncrypt(aesKey, iv, plaintext)
  return concatBytes(ephemeralRaw, iv, encrypted)
}

const buildXeapiPlaintext = (uri, data, options = {}) => {
  const fields = {}
  const contentType =
    options.contentType || 'application/x-www-form-urlencoded;charset=utf-8'
  const mediaType = contentType.split(';', 1)[0].toLowerCase()
  if (mediaType !== 'application/x-www-form-urlencoded') {
    fields.contentType = contentType
  }
  const method = (options.method || 'POST').toUpperCase()
  if (method !== 'POST') fields.method = method
  const url = new URL(uri, 'https://interface.music.163.com')
  if (url.search) fields.queryString = url.search.slice(1)
  if (data !== undefined && data !== null) {
    const bodyData = { ...data }
    delete bodyData.e_r
    const body = utf8ToBytes(new URLSearchParams(bodyData).toString())
    if (body.length) {
      if (mediaType === 'application/x-www-form-urlencoded' && isUtf8(body)) {
        fields.content = bytesToUtf8(body)
      } else {
        fields.body = bytesToBase64(body)
      }
    }
  }
  if (fields.queryString) {
    fields.queryString += '&e_r=true'
  } else {
    fields.queryString = 'e_r=true'
  }
  return JSON.stringify(fields)
}

// ---------- 各加密方式（与原版同名同参；xeapi 为 async） ----------
const weapi = (object) => {
  const text = JSON.stringify(object)
  let secretKey = ''
  for (let i = 0; i < 16; i++) {
    secretKey += base62.charAt(Math.round(Math.random() * 61))
  }
  return {
    params: aesEncrypt(
      aesEncrypt(text, 'cbc', presetKey, iv),
      'cbc',
      secretKey,
      iv,
    ),
    encSecKey: rsaEncrypt(secretKey.split('').reverse().join(''), publicKey),
  }
}

const linuxapi = (object) => {
  const text = JSON.stringify(object)
  return {
    eparams: aesEncrypt(text, 'ecb', linuxapiKey, '', 'hex'),
  }
}

const eapi = (url, object) => {
  const text = typeof object === 'object' ? JSON.stringify(object) : object
  const message = `nobody${url}use${text}md5forencrypt`
  const digest = CryptoJS.MD5(message).toString()
  const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`
  return {
    params: aesEncrypt(data, 'ecb', eapiKey, '', 'hex'),
  }
}
const eapiResDecrypt = (encryptedParams, aeapi = false) => {
  try {
    const decrypted = aesDecrypt(encryptedParams, 'ecb', eapiKey, '', 'hex')
    if (aeapi) {
      const decryptedBuffer = base64ToBytes(decrypted.toString(CryptoJS.enc.Base64))
      const decompressed = pako.inflate(decryptedBuffer)
      return JSON.parse(bytesToUtf8(decompressed))
    } else {
      return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8))
    }
  } catch (error) {
    console.log(`eapiResDecrypt error:`, error)
    return null
  }
}
const eapiReqDecrypt = (encryptedParams) => {
  const decryptedData = aesDecrypt(
    encryptedParams,
    'ecb',
    eapiKey,
    '',
    'hex',
  ).toString(CryptoJS.enc.Utf8)
  const match = decryptedData.match(/(.*?)-36cd479b6b5-(.*?)-36cd479b6b5-(.*)/)
  if (match) {
    const url = match[1]
    const data = JSON.parse(match[2])
    return { url, data }
  }
  return null
}
const decrypt = (cipher) => {
  const decipher = CryptoJS.AES.decrypt(
    {
      ciphertext: CryptoJS.enc.Hex.parse(cipher),
    },
    eapiKey,
    {
      mode: CryptoJS.mode.ECB,
    },
  )
  const decryptedBytes = CryptoJS.enc.Utf8.stringify(decipher)
  return decryptedBytes
}

const xeapi = async (uri, data, options = {}) => {
  const publicKeyState = options.publicKeyState
  if (!publicKeyState) {
    throw new Error('xeapi publicKeyState is required')
  }
  const activeSessionKey = options.sessionKey
    ? utf8ToBytes(String(options.sessionKey))
    : null
  const activeSessionId = options.sessionId || ''
  const dynamicKey = activeSessionKey || randomBytes(16)
  const plaintext = utf8ToBytes(buildXeapiPlaintext(uri, data, options))
  const c = aesEcbEncrypt(
    dynamicKey,
    xeapiMidTransform(aesEcbEncrypt(xeapiStaticKey, plaintext)),
  )
  const s = await xeapiEncryptS(dynamicKey, publicKeyState, options.os || 'android')
  const r = aesEcbEncrypt(
    xeapiStaticKey,
    utf8ToBytes(
      `${publicKeyState.version}|${activeSessionKey ? activeSessionId : ''}`,
    ),
  )
  return {
    C: bytesToBase64url(c),
    S: bytesToBase64(s),
    R: bytesToBase64(r),
  }
}

const xeapiResDecrypt = (body) => {
  const bytes = body instanceof Uint8Array ? body : new Uint8Array(body)
  const decrypted = aesEcbDecrypt(eapiKey, bytes)
  const plaintext =
    decrypted[0] === 0x1f && decrypted[1] === 0x8b
      ? pako.inflate(decrypted)
      : decrypted
  return JSON.parse(bytesToUtf8(plaintext))
}

const xeapiDecryptPublicKey = (encryptedData) => {
  return JSON.parse(
    bytesToUtf8(
      aesEcbDecrypt(
        xeapiStaticKey,
        typeof encryptedData === 'string'
          ? base64ToBytes(encryptedData)
          : encryptedData,
      ),
    ),
  )
}

// neapi（ChaCha20-Poly1305 + zstd）：Web Crypto 不支持 ChaCha20-Poly1305，
// 且没有任何模块使用 neapi 加密；保留导出名以便调用方报错明确，不静默走偏。
const neapi = (_data, _config) => {
  throw new Error('neapi 加密在 EdgeOne 边缘函数上暂不支持（ChaCha20-Poly1305 无 Web Crypto 实现）')
}
const neapiResDecrypt = (_body, _config) => {
  throw new Error('neapi 解密在 EdgeOne 边缘函数上暂不支持（ChaCha20-Poly1305 无 Web Crypto 实现）')
}

module.exports = {
  weapi,
  linuxapi,
  eapi,
  xeapi,
  neapi,
  decrypt,
  aesEncrypt,
  aesDecrypt,
  eapiReqDecrypt,
  eapiResDecrypt,
  xeapiSign,
  xeapiResDecrypt,
  xeapiDecryptPublicKey,
  neapiResDecrypt,
}
