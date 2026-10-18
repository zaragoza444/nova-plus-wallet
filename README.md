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

## Nova Online Bank

The wallet member surface for the live Nova Online Bank API is at `#/nova` (sign-in, accounts, transfer, exchange, cards). Balances and transfers are production funds.

The browser calls a same-origin `/nova-api` proxy in `npm run dev` and `npm start`. On `novabank.uk` the client calls the bank API directly. Set `VITE_NOVA_BANK_API_URL` only to an allowlisted HTTPS host (`nova-bank-api-production-7311.up.railway.app`, `api.nova-x.io`, or `www.nova-x.io`). GitHub Pages cannot proxy; that host works when the page origin is allowlisted by the bank.
