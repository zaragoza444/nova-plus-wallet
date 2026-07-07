import { getChain, type ChainDef, type TokenDef } from "../chains";
import {
  BRIDGE_HUB_CHAIN_ID,
  BRIDGE_VAULT_CHAIN_ID,
  HUB_CANONICAL_TOKEN,
  SUPER_BRIDGE_SPOKE_IDS,
} from "./constants";

export interface BridgeToken {
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  address: string;
}

export function getHubLockToken(): BridgeToken {
  const chain = getChain(BRIDGE_HUB_CHAIN_ID);
  const listed = chain?.tokens.find(
    (t) => t.address?.toLowerCase() === HUB_CANONICAL_TOKEN.toLowerCase(),
  );
  return {
    chainId: BRIDGE_HUB_CHAIN_ID,
    symbol: listed?.symbol ?? "ALL",
    name: listed?.name ?? "ALLTRA",
    decimals: listed?.decimals ?? 18,
    address: HUB_CANONICAL_TOKEN,
  };
}

/** BridgeSpoke contract is the wrapped ERC-20 on spoke chains. */
export function getSpokeBurnToken(chainId: number): BridgeToken | null {
  if (!SUPER_BRIDGE_SPOKE_IDS.includes(chainId)) return null;
  const chain = getChain(chainId);
  const portal = chain?.bridge?.address;
  if (!portal) return null;
  return {
    chainId,
    symbol: "wALL",
    name: "Wrapped ALL",
    decimals: 18,
    address: portal,
  };
}

export function getVaultOutboundTokens(chain: ChainDef): BridgeToken[] {
  if (chain.id !== BRIDGE_VAULT_CHAIN_ID) return [];
  return chain.tokens
    .filter((t): t is TokenDef & { address: string } => Boolean(t.address))
    .map((t) => ({
      chainId: chain.id,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      address: t.address,
    }));
}

export function bridgeTokensForRoute(fromChainId: number, pathKind: string): BridgeToken[] {
  if (pathKind === "hub_lock_mint" && fromChainId === BRIDGE_HUB_CHAIN_ID) {
    return [getHubLockToken()];
  }
  if (pathKind === "spoke_burn_release") {
    const t = getSpokeBurnToken(fromChainId);
    return t ? [t] : [];
  }
  if (pathKind === "vault_outbound" && fromChainId === BRIDGE_VAULT_CHAIN_ID) {
    const chain = getChain(BRIDGE_VAULT_CHAIN_ID);
    return chain ? getVaultOutboundTokens(chain) : [];
  }
  return [];
}
