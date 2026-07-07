# Signet Wallet — Branding Pack

Official assets from **Signet_Wallet_Branding_Pack** go here. To replace the bundled defaults with your pack files, copy them in and run sync.

```bash
npm run brand:sync
npm run dev
```

The sync script finds logos, fonts, and token JSON anywhere under `branding/` and publishes them to `public/brand/`.

## Expected assets (names are flexible)

| Asset | Typical filenames |
|-------|-------------------|
| Primary logo | `logo.svg`, `Signet_Logo.svg`, `signet-logo.png` |
| Mark / icon | `logo-mark.svg`, `icon.svg`, `favicon.svg` |
| Wordmark | `wordmark.svg`, `Signet_Wordmark.svg` |
| Colors | `brand-tokens.json`, `colors.json`, `tokens.json` |
| Fonts | `.woff2`, `.woff`, `.ttf` in any subfolder |

Optional `brand-tokens.json` shape:

```json
{
  "colors": {
    "bg": "#08080C",
    "gold": "#C9A84C",
    "burgundy": "#8C2A3E"
  },
  "fonts": {
    "display": "Cormorant Garamond",
    "body": "Inter"
  },
  "copy": {
    "tagline": "Your multi-chain wallet for the AnakaTech ecosystem"
  }
}
```

After sync, hard-refresh the app (Ctrl+Shift+R).
