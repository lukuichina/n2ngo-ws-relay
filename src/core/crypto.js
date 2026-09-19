/**
 * 加密工具模块
 * 使用 Web Crypto API 实现：
 * - RSA-OAEP 解密 MachineID (Supernode 私钥解密 Edge 发来的加密 MachineID)
 * - RSA 公钥导入/导出 (DER/SPKI 格式)
 * - AES-GCM 加密/解密 (可选，用于控制面加密)
 * - 社区密钥派生 (PBKDF2)
 */

// 缓存导入的密钥
const keyCache = new Map();

/**
 * 从 PEM 格式导入 RSA 公钥
 * @param {string} pem - PEM 格式公钥 (-----BEGIN PUBLIC KEY----- ...)
 * @returns {Promise<CryptoKey>}
 */
export async function importRSAPublicKey(pem) {
  const cacheKey = `pub:${pem.slice(0, 50)}`;
  if (keyCache.has(cacheKey)) return keyCache.get(cacheKey);

  // 移除 PEM 头尾和换行
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'spki',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt', 'verify']
  );

  keyCache.set(cacheKey, key);
  return key;
}

/**
 * 从 PEM 格式导入 RSA 私钥
 * @param {string} pem - PEM 格式私钥 (-----BEGIN PRIVATE KEY----- ... 或 PKCS#8)
 * @returns {Promise<CryptoKey>}
 */
export async function importRSAPrivateKey(pem) {
  const cacheKey = `priv:${pem.slice(0, 50)}`;
  if (keyCache.has(cacheKey)) return keyCache.get(cacheKey);

  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
    .replace(/-----END RSA PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['decrypt', 'sign']
  );

  keyCache.set(cacheKey, key);
  return key;
}

/**
 * 生成 RSA 密钥对 (用于 Supernode 初始化)
 * @param {number} modulusLength - 模数长度 (默认 2048)
 * @returns {Promise<CryptoKeyPair>}
 */
export async function generateRSAKeyPair(modulusLength = 2048) {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: 'SHA-256',
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * 导出 RSA 公钥为 SPKI DER 格式 (Uint8Array)
 * @param {CryptoKey} publicKey
 * @returns {Promise<Uint8Array>}
 */
export async function exportRSAPublicKeyDER(publicKey) {
  const der = await crypto.subtle.exportKey('spki', publicKey);
  return new Uint8Array(der);
}

/**
 * 导出 RSA 公钥为 PEM 格式
 * @param {CryptoKey} publicKey
 * @returns {Promise<string>}
 */
export async function exportRSAPublicKeyPEM(publicKey) {
  const der = await exportRSAPublicKeyDER(publicKey);
  const b64 = btoa(String.fromCharCode(...der));
  const lines = b64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

/**
 * 导出 RSA 私钥为 PKCS#8 DER 格式
 * @param {CryptoKey} privateKey
 * @returns {Promise<Uint8Array>}
 */
export async function exportRSAPrivateKeyDER(privateKey) {
  const der = await crypto.subtle.exportKey('pkcs8', privateKey);
  return new Uint8Array(der);
}

/**
 * 导出 RSA 私钥为 PEM 格式
 * @param {CryptoKey} privateKey
 * @returns {Promise<string>}
 */
export async function exportRSAPrivateKeyPEM(privateKey) {
  const der = await exportRSAPrivateKeyDER(privateKey);
  const b64 = btoa(String.fromCharCode(...der));
  const lines = b64.match(/.{1,64}/g).join('\n');
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`;
}

/**
 * RSA-OAEP 解密 (Supernode 用私钥解密 Edge 发来的 EncryptedMachineID)
 * @param {CryptoKey} privateKey - RSA 私钥
 * @param {Uint8Array} ciphertext - 密文
 * @returns {Promise<Uint8Array>} 明文 (MachineID)
 */
export async function decryptRSA_OAEP(privateKey, ciphertext) {
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      ciphertext
    );
    return new Uint8Array(plaintext);
  } catch (e) {
    console.error('[Crypto] RSA-OAEP decrypt failed:', e);
    throw new Error('RSA decryption failed: invalid ciphertext or key');
  }
}

/**
 * RSA-OAEP 加密 (Edge 用 Supernode 公钥加密 MachineID)
 * @param {CryptoKey} publicKey - RSA 公钥
 * @param {Uint8Array} plaintext - 明文 (MachineID)
 * @returns {Promise<Uint8Array>} 密文
 */
export async function encryptRSA_OAEP(publicKey, plaintext) {
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    plaintext
  );
  return new Uint8Array(ciphertext);
}

/**
 * 从社区密码派生 AES-GCM 密钥 (PBKDF2)
 * @param {string} passphrase - 社区密码
 * @param {Uint8Array} salt - 盐值 (建议 16 字节)
 * @param {number} iterations - 迭代次数 (默认 100000)
 * @returns {Promise<CryptoKey>}
 */
export async function deriveCommunityKey(passphrase, salt, iterations = 100000) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * AES-GCM 加密
 * @param {CryptoKey} key
 * @param {Uint8Array} plaintext
 * @param {Uint8Array} nonce - 12 字节 nonce
 * @param {Uint8Array} [associatedData] - 关联数据 (AAD)
 * @returns {Promise<Uint8Array>} ciphertext || authTag (拼接)
 */
export async function aesGCMEncrypt(key, plaintext, nonce, associatedData) {
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: associatedData, tagLength: 128 },
    key,
    plaintext
  );
  return new Uint8Array(ciphertext); // 包含 auth tag (最后 16 字节)
}

/**
 * AES-GCM 解密
 * @param {CryptoKey} key
 * @param {Uint8Array} ciphertext - 密文 || authTag (拼接)
 * @param {Uint8Array} nonce - 12 字节 nonce
 * @param {Uint8Array} [associatedData] - 关联数据 (AAD)
 * @returns {Promise<Uint8Array>} 明文
 */
export async function aesGCMDecrypt(key, ciphertext, nonce, associatedData) {
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce, additionalData: associatedData, tagLength: 128 },
      key,
      ciphertext
    );
    return new Uint8Array(plaintext);
  } catch (e) {
    console.error('[Crypto] AES-GCM decrypt failed:', e);
    throw new Error('AES-GCM decryption failed: invalid key, nonce, or corrupted data');
  }
}

/**
 * 生成随机 nonce (12 字节，适用于 AES-GCM)
 * @returns {Uint8Array}
 */
export function generateNonce() {
  return crypto.getRandomValues(new Uint8Array(12));
}

/**
 * 生成随机盐值
 * @param {number} length - 长度 (默认 16)
 * @returns {Uint8Array}
 */
export function generateSalt(length = 16) {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * 计算 SHA-256 哈希
 * @param {Uint8Array} data
 * @returns {Promise<Uint8Array>}
 */
export async function sha256(data) {
  const hash = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hash);
}

/**
 * 验证 MachineID 格式 (n2n-go 通常是 16-32 字节随机值)
 * @param {Uint8Array} machineID
 * @returns {boolean}
 */
export function validateMachineID(machineID) {
  return machineID && machineID.length >= 16 && machineID.length <= 64;
}