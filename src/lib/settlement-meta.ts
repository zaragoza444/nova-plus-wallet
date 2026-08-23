/** Nova settlement meta (m2) liquidity rails for NovaONE 22016 and NRW World 33001. */

import {
  NOVA_ONE_SWAP_ROUTER,
  NOVA_ONE_WRAPPED_BRIDGE,
  NRW_WORLD_SWAP_ROUTER,
  NRW_WORLD_WRAPPED_BRIDGE,
} from "./nova-mesh-tokens";
import { ALLOWED_NOVA_API_HOSTS } from "./nova-api";

export { ALLOWED_NOVA_API_HOSTS };

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
  chainStatusPath: string;
  swapStatusPath: string;
  routersStatusPath: string;
  marketQuotePath: string;
  exchangeInfoPath: string;
  nrwHubPath: string;
}

const PATHS = {
  novaStatus: "/chains/nova-one",
  nrwStatus: "/chains/nrw-world",
  swapStatus: "/swap/status",
  routers: "/chains/liquidity/routers/status",
  quote: "/chains/nova-one/markets/quote",
  exchangeInfo: "/chains/nova-one/markets/exchangeInfo",
  nrwHub: "/chains/nrw-world/liquidity/hub",
} as const;

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
    chainStatusPath: PATHS.novaStatus,
    swapStatusPath: PATHS.swapStatus,
    routersStatusPath: PATHS.routers,
    marketQuotePath: PATHS.quote,
    exchangeInfoPath: PATHS.exchangeInfo,
    nrwHubPath: PATHS.nrwHub,
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
    chainStatusPath: PATHS.nrwStatus,
    swapStatusPath: PATHS.swapStatus,
    routersStatusPath: PATHS.routers,
    marketQuotePath: PATHS.quote,
    exchangeInfoPath: PATHS.exchangeInfo,
    nrwHubPath: PATHS.nrwHub,
  },
};

export function getSettlementRail(chainId: number): SettlementMetaRail | undefined {
  return isSettlementMetaChain(chainId) ? SETTLEMENT_META_RAILS[chainId] : undefined;
}
