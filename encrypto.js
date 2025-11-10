// encrypto.js

/**
 * 工具函数：将 Uint8Array 转 Base64URL
 */
function bufToBase64url(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 工具函数：将 Base64 或 Base64URL 转 Uint8Array
 */
function base64ToBuf(base64url) {
    let b64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const buf = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        buf[i] = binary.charCodeAt(i);
    }
    return buf;
}

/**
 * 随机生成 salt（16字节）并返回 Base64URL
 */
function generateSalt() {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return bufToBase64url(salt);
}

/**
 * 派生 AES-GCM 密钥（PBKDF2）
 */
async function deriveKey(password, saltBase64url) {
    const enc = new TextEncoder();
    const saltBytes = base64ToBuf(saltBase64url);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 150000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );

    return key;
}

/**
 * 零知识加密函数
 * text: 要加密的字符串
 * password: 可选，用户提供密码（字符串），不提供则生成高熵随机密码
 * 返回 { salt, iv, ciphertext, key } 其中 key 可直接放 URL fragment
 */
export async function encrypt(text, password) {
    // 如果没有提供密码，则生成随机 Base64URL 字符串
    const secret = password || bufToBase64url(crypto.getRandomValues(new Uint8Array(24)));

    const salt = generateSalt();
    const key = await deriveKey(secret, salt);

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuf = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(text)
    );

    return {
        salt,
        iv: bufToBase64url(iv),
        ciphertext: bufToBase64url(ciphertextBuf),
        key: secret // 字符串形式，可直接放 fragment
    };
}
