// decrypto.js

/**
 * 工具函数：Base64URL 转 Uint8Array
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
 * 工具函数：Uint8Array 转 Base64URL
 */
function bufToBase64url(buf) {
    let binary = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
        ['decrypt']
    );

    return key;
}

/**
 * 零知识解密
 * encryptedObj: { salt, iv, ciphertext } (Base64URL)
 * password: 用户密钥
 */
export async function decrypt(encryptedObj, password) {
    const key = await deriveKey(password, encryptedObj.salt);
    const iv = base64ToBuf(encryptedObj.iv);
    const ciphertext = base64ToBuf(encryptedObj.ciphertext);

    const decryptedBuf = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(decryptedBuf);
}
