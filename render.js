// render.js
import '@material/mwc-snackbar/mwc-snackbar.js';
import DOMPurify from 'dompurify';
import '@material/web/all.js';

import { encrypt } from './encrypto';
import { decrypt } from './decrypto';
import logo from "./favicon.svg";
import './style.css';

const API_BASE = "https://secret-post.3ns76ymur.workers.dev";

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
        title.innerHTML = `<img class="logo" src="${logo}"/><a href='/' style='color:white'>Secret Post</a>`
        document.body.appendChild(title);

        const form = document.createElement("div");
        form.id = "form";
        form.innerHTML = `
            <div class="intro">
                <md-tabs id="usage-anchor">
                    <span id="AboutButton">
                        <md-primary-tab>About</md-primary-tab>
                    </span>
                    <span id="ShowConfig">
                        <md-primary-tab>Config</md-primary-tab>
                    </span>
                    <span id="button-send">
                        <md-primary-tab>Send</md-primary-tab>
                    </span>
                </md-tabs>
            </div>

            <md-dialog id="about-dialog">
                <div slot="headline">
                    About
                </div>
                <form slot="content" method="dialog">
                    <ul id="intro-list" anchor="usage-anchor">
                        <li slot="headline">Secret Post is a secure, zero-knowledge text sharing platform.</li>
                        <li slot="headline">No registration required: generate encrypted links instantly.</li>
                        <li slot="headline">Set expiration times or enable burn-after-read.</li>
                        <li slot="headline">Choose your own password or let us generate one for you.</li>
                        <li slot="headline">Completely zero-knowledge: even the server cannot read your content.</li>
                    </ul>
                </form>
                <div slot="actions">
                    <md-filled-button id="close-about-dialog">Close</md-filled-button>
                </div>
            </md-dialog>

            <md-dialog id="config-dialog">
                <div slot="headline">Config</div>
                <div slot="content" id="config-form" method="dialog">
                    <div class="form">
                        <form class="dialog-config-form">
                            <div class="form-element">
                                <div style="display: flex;justify-content: space-between;">
                                    <label style="padding-top:5px;padding-right:30px;">Burning after read:</label>
                                    <md-switch type="checkbox" name="burnAfterRead" id="burnAfterRead"/>
                                </div>
                                <span></span>
                            </div>

                            <div class="form-element">
                                <label>Expired At:</label>
                                <md-outlined-select label="Expiration" name="pasteExpiration" style="margin-top:5px;">
                                    <md-select-option value="86400000">
                                        <div slot="headline">1 day</div>
                                    </md-select-option>
                                    <md-select-option value="604800000" selected>
                                        <div slot="headline">1 week</div>
                                    </md-select-option>
                                    <md-select-option value="18144000000">
                                        <div slot="headline">1 month</div>
                                    </md-select-option>
                                    <md-select-option value="6622560000000">
                                        <div slot="headline">1 year</div>
                                    </md-select-option>
                                </md-outlined-select>
                            </div>
                            
                            <div class="form-element" style="margin-bottom:37px;margin-top:15px">
                                <label>Passwod (optinal)</label>
                                <md-outlined-text-field label="password" type="password" name="password" id="password" autocomplete="new-password"/>
                            </div>
                        </form>
                    </div>
                    <div slot="actions" style="display: flex;justify-content:flex-end;">
                        <md-filled-button form="dialog-button-ApplyConfig" style="margin-right:1rem">Apply</md-filled-button>
                    </div>
                </div>
            </md-dialog>
        `;
        document.body.appendChild(form);

        const aboutDialog = document.querySelector("#about-dialog")
        const AboutButton = document.querySelector("#AboutButton")
        const cloeAboutDialog = document.querySelector("#close-about-dialog")
        const configDialog = document.querySelector("#config-dialog")
        const ShowConfig = document.querySelector("#ShowConfig")
        const DialogButton_OK = document.querySelector("#button-send")
        const DialogButton_ApplyConfig = document.querySelector("md-filled-button[form=\"dialog-button-ApplyConfig\"]")
        ShowConfig.addEventListener("click", () => configDialog.open = true)
        DialogButton_ApplyConfig.addEventListener("click", () => configDialog.open = false)
        DialogButton_OK.addEventListener("click", () => {
            const ButtonSend = document.querySelector("#button-send > md-primary-tab")
            ButtonSend.innerText = "Sending..."
            submitData().then(()=>{
            ButtonSend.innerText = "Send"
                configDialog.open = false
            })
        })
        AboutButton.addEventListener("click", () => {
            aboutDialog.open = true
        })
        cloeAboutDialog.addEventListener("click", () => {
            aboutDialog.open = false
        })

        // === iframe 编辑器 ===
        const iframe = document.createElement("iframe");
        iframe.id = "editor-frame";

        // 内嵌 CSS
        const editorCSS = `
            .ql-editor, .ql-blank {
                flex:1;
            }

            body {
                height: calc( 100vh - 17px );
                background-color: white;
                display: flex;
                flex-direction: column;
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
        //form.addEventListener('submit', async (e) => {e.preventDefault()});

        async function submitData() {

            const dialogConfigForm = document.querySelector("form.dialog-config-form")
            const formData = new FormData(dialogConfigForm);
            const data = Object.fromEntries(formData.entries());
            console.log(data)

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
            const dialog = document.createElement("div");
            dialog.innerHTML = `
                <md-dialog id="dialog-result" open>
                    <div slot="headline">
                        URL Generated
                    </div>
                    <div slot="content"method="dialog">
                        <p>Your paste link:</p>
                        <input type="text" value="${url}" readonly style="width:100%;margin:0"/>
                    </div>
                    <div slot="actions">
                        <md-filled-button id="copy">Copy link</md-filled-button>
                        <md-text-button id="close-dialog-result">Close</md-text-button>
                    </div>
                </md-dialog>
            `;
            document.body.appendChild(dialog);
            const dialogResult = document.querySelector("#dialog-result")
            const closeDialogResult = document.querySelector("#close-dialog-result")
            closeDialogResult.onclick = () => dialogResult.close()
            dialogResult.addEventListener("closed", () => window.location.replace("/"))



            dialog.querySelector("#copy").onclick = async () => {
                try {
                    await navigator.clipboard.writeText(url)
                    const snackbar = document.createElement('mwc-snackbar');
                    document.body.appendChild(snackbar);
                    snackbar.labelText = 'Coppied Successfully';
                    snackbar.open = true
                } catch (error) {
                    const snackbar = document.createElement('mwc-snackbar');
                    document.body.appendChild(snackbar);
                    snackbar.labelText = 'Failed to Copy, please try again later';
                    const RETRY_button = document.createElement("mwc-button")
                    RETRY_button.innerText = "RETRY"
                    RETRY_button.onclick = () => dialog.querySelector("#copy").onclick()
                    RETRY_button.slot = "action"
                    snackbar.append(RETRY_button)
                    snackbar.open = true
                }
            };

        }


    } else {
        // === 解密模式 ===
        document.body.innerHTML = "";
        const title = document.createElement("h1");
        title.className = "title"
        title.innerHTML = `<img class="logo" src="${logo}"/><a href='/' style='color:white'>Secret Post</a>`
        document.body.appendChild(title);

        const form = document.createElement("div");
        form.id = "form";
        form.innerHTML = `
            <div class="intro">
                <md-tabs id="usage-anchor">
                    <span id="AboutButton">
                        <md-primary-tab>About</md-primary-tab>
                    </span>
                    <span id="button-send">
                        <a href="/">
                            <md-primary-tab>Send your own post</md-primary-tab>
                        </a>
                    </span>
                    <span>
                        <md-primary-tab></md-primary-tab>
                    </span>
                </md-tabs>
            </div>

            <md-dialog id="about-dialog">
                <div slot="headline">
                    About
                </div>
                <form slot="content" method="dialog">
                    <ul id="intro-list" anchor="usage-anchor">
                        <li slot="headline">Secret Post is a secure, zero-knowledge text sharing platform.</li>
                        <li slot="headline">No registration required: generate encrypted links instantly.</li>
                        <li slot="headline">Set expiration times or enable burn-after-read.</li>
                        <li slot="headline">Choose your own password or let us generate one for you.</li>
                        <li slot="headline">Completely zero-knowledge: even the server cannot read your content.</li>
                    </ul>
                </form>
                <div slot="actions">
                    <md-filled-button id="close-about-dialog">Close</md-filled-button>
                </div>
            </md-dialog>

        `
        document.body.append(title, form);

        const aboutDialog = document.querySelector("#about-dialog")
        const AboutButton = document.querySelector("#AboutButton")
        const closeAboutDialog = document.querySelector("#close-about-dialog")
        AboutButton.onclick = () => aboutDialog.open = true
        
        closeAboutDialog.onclick = ()=>aboutDialog.open = false
        let passwd = "";
        const frag = window.location.hash;
        if (frag && frag.length > 1) {
            passwd = decodeURIComponent(frag.slice(1));
            renderDecryptResult(passwd)
        } else {
            const passwordInputDialogContainer = document.createElement("div")
            passwordInputDialogContainer.innerHTML = `
                <md-dialog id="passwd-input-dialog">
                    <div slot="headline">
                        Message Encrypted
                    </div>
                    <form slot="content" method="dialog">
                        <md-filled-text-field id="password-input" label="Password" type="password" ></md-filled-text-field>
                    </form>
                    <div slot="actions">
                        <md-outlined-button onclick="document.write('Request Canceled')">Cancel</md-outlined-button>
                        <md-filled-button id="open-button">Decrypt</md-filled-button>
                    </div>
                </md-dialog>
            `
            document.body.append(passwordInputDialogContainer)
            const passwordInputDialog = document.querySelector("#passwd-input-dialog")
            passwordInputDialog.open = true
            const openButton = document.querySelector("#open-button")
            openButton.onclick = async () => {
                passwd = document.querySelector("#password-input").value
                openButton.innerText = "Decrypting..."
                await renderDecryptResult(passwd)
                passwordInputDialog.close()
            }
        }
        async function renderDecryptResult(password) {


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
}

run();
