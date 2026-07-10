# Nova Plus Wallet

Self-custody chain wallet SPA for the Nova Bank mesh (Signet fork).

Live: https://novablockchainsystem.com/wallet/

## Chains

- NovaONE (22016) - https://novablockchainsystem.com/novaone-rpc/
- NRW World, ALLTRA, ecosystem tokens via nova-chains.json

## Build from Nova monorepo

    cd ../nova
    npm run nova-plus:deploy -- -CopyToSiblingRepo

## VPS deploy

    npm run nova-plus:deploy

Served from /var/www/nova-plus-wallet (nginx location /wallet/).

Source: @nova/swap in the Nova monorepo (github.com/zaragoza444/nova).
