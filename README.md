# Nova Plus Wallet

Self-custody chain wallet SPA for the Nova Bank mesh (Signet fork).

Live: https://novabank.uk/wallet/

## Chains

- NovaONE (22016) - https://novabank.uk/novaone-rpc/
- NRW World, ALLTRA, ecosystem tokens via nova-chains.json

## Build from Nova monorepo

    cd ../nova
    npm run nova-plus:deploy -- -CopyToSiblingRepo

## VPS deploy

    npm run nova-plus:deploy

Built into the NovaBank production image and served from `/wallet/`.

Source: @nova/swap in the Nova monorepo (github.com/zaragoza444/nova).
