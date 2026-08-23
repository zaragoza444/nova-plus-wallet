/** Nova settlement meta (m2) liquidity rails for NovaONE 22016 and NRW World 33001. */

import {
  NOVA_ONE_SWAP_ROUTER,
  NOVA_ONE_WRAPPED_BRIDGE,
  NRW_WORLD_SWAP_ROUTER,
  NRW_WORLD_WRAPPED_BRIDGE,
} from "./nova-mesh-tokens";

const env = (import.meta as unknown as { env?: Record<string, string> }).env;

export const NOVA_API_V1 =
  env?.VITE_NOVA_API_URL?.replace(/\/$/, "") ??
  "https://nova-bank-api-production-7311.up.railway.app/api/v1";

export const ALLOWED_NOVA_API_HOSTS = new Set([
  "nova-bank-api-production-7311.up.railway.app",
  "novabank.uk",
]);

try {
  const host = new URL(NOVA_API_V1).hostname;
  if (host) ALLOWED_NOVA_API_HOSTS.add(host);
} catch {
  /* keep defaults */
}

export const SETTLEMENT_META_CHAIN_IDS = [22016, 33001] as const;

export type SettlementMetaChainId = (typeof SETTLEMENT_META_CHAIN_IDS)[number];

export function isSettlementMetaChain(chainId: number): chainId is SettlementMetaChainId {
  return chainId === 22016 || chainId === 33001;
}

export interface SettlementMetaRail {
  chainId: SettlementMetaChainId;
  slug: "nova-one" | "nrw-world";
  name: string;
  nativeSymbol: string;
  swapRouter: string;
  wrappedBridge: string;
  settlement: "meta";
  liquidity: "nova-settlement-meta";
  settlementPath: string;
  liquidityHubPath: string;
  marketQuotePath: string;
  routersStatusPath: string;
}

export const SETTLEMENT_META_RAILS: Record<SettlementMetaChainId, SettlementMetaRail> = {
  22016: {
    chainId: 22016,
    slug: "nova-one",
    name: "NovaONE",
    nativeSymbol: "NOVA",
    swapRouter: NOVA_ONE_SWAP_ROUTER,
    wrappedBridge: NOVA_ONE_WRAPPED_BRIDGE,
    settlement: "meta",
    liquidity: "nova-settlement-meta",
    settlementPath: `${NOVA_API_V1}/settlement/meta/status`,
    liquidityHubPath: `${NOVA_API_V1}/chains/nova-one/liquidity/hub`,
    marketQuotePath: `${NOVA_API_V1}/chains/nova-one/markets/quote`,
    routersStatusPath: `${NOVA_API_V1}/chains/liquidity/routers/status`,
  },
  33001: {
    chainId: 33001,
    slug: "nrw-world",
    name: "NRW World",
    nativeSymbol: "NRW",
    swapRouter: NRW_WORLD_SWAP_ROUTER,
    wrappedBridge: NRW_WORLD_WRAPPED_BRIDGE,
    settlement: "meta",
    liquidity: "nova-settlement-meta",
    settlementPath: `${NOVA_API_V1}/settlement/meta/status`,
    liquidityHubPath: `${NOVA_API_V1}/chains/nrw-world/liquidity/hub`,
    marketQuotePath: `${NOVA_API_V1}/chains/nova-one/markets/quote`,
    routersStatusPath: `${NOVA_API_V1}/chains/liquidity/routers/status`,
  },
};

export function getSettlementRail(chainId: number): SettlementMetaRail | undefined {
  return isSettlementMetaChain(chainId) ? SETTLEMENT_META_RAILS[chainId] : undefined;
}
