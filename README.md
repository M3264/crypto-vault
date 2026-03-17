# CryptoVault

Secure storage for private keys, wallet addresses, and seed phrases.

## Live Version:
[vault.kennyy.xyz](https://vault.kennyy.xyz)

## How it works

Sign in with Google — your vault is stored as an encrypted file in your own Google Drive. The encryption happens locally in your browser before anything touches the network. Google only sees ciphertext.

- **AES-256-GCM** encryption with PBKDF2 key derivation (600,000 iterations)
- **TOTP-based 2FA** optional on unlock
- **Auto-lock** after configurable inactivity period
- Supports private keys, public keys, addresses, seed phrases, API keys

## Setup

```bash
npm install
```

Create a `.env.local`:

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

To get a client ID: [console.cloud.google.com](https://console.cloud.google.com) → create a project → enable the **Google Drive API** → create an **OAuth 2.0 Web Client ID** → add your domain to "Authorized JavaScript origins".

```bash
npm run dev
```

## Stack

Next.js · TypeScript · Tailwind · Web Crypto API · Google Drive REST API (appDataFolder scope)
