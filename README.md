# Nova Plus Wallet

Self-custody web wallet for **NovaONE** (22016), **NRW World** (33001), and **ALLTRA** (651940).

Forked from [Signet Wallet](https://github.com/TorNation01/sigent-old-v1) and wired to the Nova Bank production mesh at `novablockchainsystem.com`.

## Quick start

```bash
npm ci
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run typecheck
npm run build
```

Output: `dist/`

## Chain registry

Bundled `public/nova-chains.json` is exported from the Nova monorepo:

```bash
# In ../nova
npm run signet:export-chains
cp reference/signet-wallet/generated/nova-chains.json ../nova-plus-wallet/public/
```

## Deploy (VPS)

```powershell
# Build + upload to novablockchainsystem.com/wallet/
.\scripts\deploy.ps1
```

Or serve `dist/` behind nginx at `/wallet/` on `51.75.64.28`.

## Live URLs (after deploy)

- http://51.75.64.28/wallet/
- https://novablockchainsystem.com/wallet/

## Nova monorepo

Signet edge (interim): `npm run signet:deploy` in [novatrusty2-ops/nova](https://github.com/novatrusty2-ops/nova) deploys `@nova/swap` to `/signet/`.

This repo is the **full Signet-style wallet** (17 pages, keystore, bridge, swap) rebranded as Nova Plus Wallet.
