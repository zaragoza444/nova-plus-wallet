# Nova Plus Wallet

Self-custody wallet for NovaONE, NRW, OneX, and ALLTRA.

Live: https://novatrusty2-ops.github.io/nova-plus-wallet/

## OneX Online Bank

OneX Bank is a local online bank with the same member surface as Nova Online Bank: email + PIN session, ledger accounts, transfers, swap, virtual cards, and live OneX Chain (eip155:138).

```bash
npm ci
npm run onex:api    # API on http://127.0.0.1:8090
npm run dev         # wallet + bank UI on http://127.0.0.1:5199
```

Open `#/onex` for OneX Bank. Vite proxies `/api/v1` to the local API.

```bash
npm run test:onex
```
