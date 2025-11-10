// render.js
import DOMPurify from 'dompurify';
import { encrypt } from './encrypto';
import { decrypt } from './decrypto';
import './style.css';

const API_BASE = "http://localhost:8787";

/** Base64URL 随机生成函数 */
function base64url(bytes) {
    const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomSecretBase64url(len = 24) {
    const arr = crypto.getRandomValues(new Uint8Array(len));
    return base64url(arr);
}

async function run() {
    const pathname = window.location.pathname;
    const key = pathname.startsWith("/") ? pathname.slice(1) : pathname;

    if (!key) {
        // === 发布表单 ===
        document.body.innerHTML = "";
        const title = document.createElement("h1");
        title.className = "title"
        title.innerHTML = "<a href='/' style='color:white'>Secret Post</a>"
        document.body.appendChild(title);

        const form = document.createElement("form");
        form.id = "form";
        form.innerHTML = `
            <button>Send</button>
            <select id="pasteExpiration" name="pasteExpiration">
                <option value="86400000">1 day</option>
                <option value="604800000" selected>1 week</option>
                <option value="18144000000">1 month</option>
                <option value="6622560000000">1 year</option>
            </select>
            <div class="form-group">
                <input type="checkbox" name="burnAfterRead" id="burnAfterRead">
                <label for="burnAfterRead">Burning after read</label>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" name="password" id="password" autocomplete="new-password">
            </div>
        `;
        document.body.appendChild(form);

        // === iframe 编辑器 ===
        const iframe = document.createElement("iframe");
        iframe.id = "editor-frame";
        iframe.frameBorder = "0";

        // 内嵌 CSS
        const editorCSS = `
            .ql-editor, .ql-blank {
                height: 100%;
            }

            body {
                height: calc( 100vh - 64px );
                background-color: white;
                color: black;
            }
        `

        iframe.srcdoc = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css" rel="stylesheet"/>
                <style>${editorCSS}</style>
            </head>
            <body>
                <div id="toolbar-container">
                    <span class="ql-formats">
                        <select class="ql-font"></select>
                        <select class="ql-size"></select>
                    </span>
                    <span class="ql-formats">
                        <button class="ql-bold"></button>
                        <button class="ql-italic"></button>
                        <button class="ql-underline"></button>
                        <button class="ql-strike"></button>
                        <button class="ql-link"></button>
                    </span>
                    <span class="ql-formats">
                        <select class="ql-color"></select>
                        <select class="ql-background"></select>
                    </span>
                    <span class="ql-formats">
                        <button class="ql-script" value="sub"></button>
                        <button class="ql-script" value="super"></button>
                    </span>
                    <span class="ql-formats">
                        <button class="ql-header" value="1"></button>
                        <button class="ql-header" value="2"></button>
                        <button class="ql-blockquote"></button>
                        <button class="ql-code-block"></button>
                    </span>
                    <span class="ql-formats">
                        <button class="ql-list" value="ordered"></button>
                        <button class="ql-list" value="bullet"></button>
                        <button class="ql-indent" value="-1"></button>
                        <button class="ql-indent" value="+1"></button>
                    </span>
                    <span class="ql-formats">
                        <button class="ql-direction" value="rtl"></button>
                        <select class="ql-align"></select>
                    </span>
                    <span class="ql-formats">
                        <button class="ql-clean"></button>
                    </span>
                </div>
                <div id="editor"></div>
                <script src="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.js"></script>
                <script>
                    const editor = new Quill('#editor', {
                        modules: { syntax: true, toolbar: '#toolbar-container' },
                        placeholder: 'Compose an epic...',
                        theme: 'snow'
                    });
                    window.getEditorContent = () => editor.root.innerHTML;
                </script>
            </body>
            </html>
        `;
        document.body.appendChild(iframe);

        // === 表单提交 ===
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // 获取编辑器内容
            const editorDoc = iframe.contentDocument || iframe.contentWindow.document;
            const content = editorDoc.querySelector(".ql-editor")?.innerHTML || "";

            // 用户密码或随机密码
            let secret = data.password || null;
            let includeFragment = false;

            if (!secret) {
                // 如果没有用户密码，则生成随机 Base64URL 密码并放入 fragment
                secret = randomSecretBase64url(24);
                includeFragment = true;
            }

            let encrypted;
            try {
                encrypted = await encrypt(content, secret);
            } catch (err) {
                console.error("Encryption failed:", err);
                alert("Encryption failed — see console for details");
                return;
            }

            // 服务器只需要 salt, iv, ciphertext，不上传 key
            const req = {
                content: {
                    salt: encrypted.salt,
                    iv: encrypted.iv,
                    ciphertext: encrypted.ciphertext
                },
                expireDate: new Date(Date.now() + Number(data.pasteExpiration)).toISOString(),
                burnAfterRead: data.burnAfterRead === "on"
            };

            // 上传到服务器
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req)
            });

            if (!res.ok) {
                alert("Server error: " + res.statusText);
                return;
            }

            const result = (await res.text()).trim();

            // 生成最终链接
            const fragmentPart = includeFragment ? `#${encodeURIComponent(secret)}` : "";
            const url = `${location.origin}/${result}${fragmentPart}`;

            // 弹窗显示
            const dialog = document.createElement("dialog");
            dialog.innerHTML = `
                <p>Your paste link:</p>
                <input type="text" value="${url}" readonly style="width:100%;margin:0"/>
                <button id="copy">Copy link</button>
                <button id="close">Close</button>
            `;
            document.body.appendChild(dialog);
            dialog.querySelector("#copy").onclick = () => navigator.clipboard.writeText(url);
            dialog.querySelector("#close").onclick = () => dialog.close();
            dialog.showModal();
        });


    } else {
        // === 解密模式 ===
        document.body.innerHTML = "";
        const title = document.createElement("div");
        title.className = "title";
        title.innerText = "Secret Post";
        document.body.appendChild(title);

        let password = "";
        const frag = window.location.hash;
        if (frag && frag.length > 1) {
            password = decodeURIComponent(frag.slice(1));
        } else {
            password = prompt("Please enter the password:") || "";
        }

        const res = await fetch(`${API_BASE}/${key}`);
        if (!res.ok) {
            alert(res.status === 404 ? "Message not found or expired" : "Server error: " + res.statusText);
            return;
        }

        const data = await res.json();
        try {
            const plaintext = await decrypt(data.content, password);

            const iframe = document.createElement("iframe");
            iframe.id = "editor-frame";
            iframe.frameBorder = "0";

            const editorCSS = `
                .ql-editor, .ql-blank {
                    height: 100%;
                }

                body {
                    height: calc( 100vh - 64px );
                    background-color: white;
                    color: black;
                }
            `
            iframe.srcdoc = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link href="https://cdn.jsdelivr.net/npm/quill@2.0.3/dist/quill.snow.css" rel="stylesheet"/>
                    <style>${editorCSS}</style>
                </head>
                <body>
                    <div class="ql-editor">${DOMPurify.sanitize(plaintext)}</div>
                </body>
                </html>
            `;
            document.body.appendChild(iframe);
        } catch (e) {
            console.error("Decryption error:", e);
            alert("Decryption failed: wrong password or corrupted data");
        }
    }
}

run();
