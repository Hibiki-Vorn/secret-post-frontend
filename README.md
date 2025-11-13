# 🔐 Secret Post — Frontend

> A zero-knowledge encrypted paste sharing frontend.  
> All encryption and decryption happen **entirely in the browser** — the server never sees the plaintext or the key.

---

## ✨ Features

- 🔒 **End-to-end encryption** — AES-GCM + PBKDF2 handled in-browser.
- 💥 **Burn after reading** — messages deleted automatically after being viewed once.
- ⏰ **Expiration control** — 1 day, 1 week, 1 month, or 1 year.
- 🔑 **Password-based or random high-entropy key** — user can choose.
- 🧩 **Rich text editor** — powered by Quill 2.0.
- 🧼 **DOMPurify sanitization** — prevents HTML injection or XSS.
- ⚡ **Pure static frontend** — deployable anywhere.

---

## 🧰 Tech Stack

| Purpose | Technology |
|----------|-------------|
| Rich text editor | [Quill 2.0](https://quilljs.com/) (BSD 3-Clause) |
| Content sanitization | [DOMPurify](https://github.com/cure53/DOMPurify) (MIT) |
| UI components | [Material Web Components](https://github.com/material-components/material-web) (Apache 2.0) |
| Cryptography | Web Crypto API (AES-GCM + PBKDF2) |
| Build tool | Vite (optional) |

---

## 🔑 How Encryption Works

1. User enters text and an optional password.  
2. Frontend generates random `salt` and `iv`.  
3. Uses PBKDF2 (SHA-256, 150k iterations) to derive a 256-bit AES-GCM key.  
4. Encrypts content locally using Web Crypto API.  
5. Only `{ salt, iv, ciphertext }` is uploaded to the backend.  
6. Decryption key stays in the URL fragment (`#key`) — never sent to the server.

Example URL:

[https://secretpost.pages.dev/](https://secretpost.pages.dev/)

---

## 📁 Project Structure

```

frontend/
├── encrypto.js       # Encryption logic (AES-GCM)
├── decrypto.js       # Decryption logic
├── render.js         # Main UI logic
├── style.css         # App styles
└── index.html

````

---

## 🧼 License Notes for Bundled Libraries

- **Quill 2.0** — BSD 3-Clause, https://quilljs.com/  
- **DOMPurify** — MIT, https://github.com/cure53/DOMPurify  
- **Material Web Components** — Apache 2.0, https://github.com/material-components/material-web  

> When redistributing or deploying this frontend, keep their copyright notices intact.

---

## 📤 Usage

### Development

```bash
npm install
npx vite
````

### Build

```bash
npx vite build
```

Deploy `dist/` to any static hosting.
