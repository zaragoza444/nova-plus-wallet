import { getChain, type ChainDef, type TokenDef } from "../chains";
import { NOVA_ONE_TOKENS, NRW_WORLD_TOKENS } from "../nova-mesh-tokens";
import { registryTokensForChain } from "../tokenlist";
import {
  BRIDGE_HUB_CHAIN_ID,
  BRIDGE_VAULT_CHAIN_ID,
  HUB_CANONICAL_TOKEN,
  NOVA_MESH_BRIDGE_IDS,
  SUPER_BRIDGE_SPOKE_IDS,
} from "./constants";

export interface BridgeToken {
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  address: string;
}

export interface CatalogBridgeToken extends BridgeToken {
  destAddress?: string;
  lockable: boolean;
  detail: string;
}

const PRIORITY = ["USDC", "USDT", "AUSDT", "AUSDC", "WETH", "WBNB", "ETH", "BTC", "ALL", "NOVA", "NRW", "USD"];

function hasGateway(chainId: number): boolean {
  return NOVA_MESH_BRIDGE_IDS.includes(chainId);
}

function erc20(address: string | null | undefined): address is string {
  return Boolean(address && /^0x[0-9a-fA-F]{40}$/.test(address));
}

function catalogSource(chainId: number): TokenDef[] {
  if (chainId === 22016) return NOVA_ONE_TOKENS;
  if (chainId === 33001) return NRW_WORLD_TOKENS;
  const chain = getChain(chainId);
  const listed = chain?.tokens ?? [];
  const remote = registryTokensForChain(chainId).map((t) => ({
    symbol: t.symbol,
    name: t.name,
    decimals: t.decimals,
    address: t.address,
    standard: "erc20" as const,
  }));
  const seen = new Set(listed.map((t) => t.symbol.toUpperCase()));
  return [
    ...listed,
    ...remote.filter((t) => {
      const key = t.symbol.toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
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

export function getNovaMeshLockTokens(fromChainId: number): BridgeToken[] {
  return catalogTokensForPair(
    fromChainId,
    fromChainId === 22016 ? 33001 : 22016,
  ).filter((t) => t.lockable);
}

export function catalogTokensForPair(fromChainId: number, toChainId: number): CatalogBridgeToken[] {
  const bothGateways = hasGateway(fromChainId) && hasGateway(toChainId);
  const map = new Map<string, CatalogBridgeToken>();

  const add = (chainId: number, token: TokenDef) => {
    const symbol = token.symbol.trim().toUpperCase();
    if (!symbol) return;
    const row = map.get(symbol) ?? {
      chainId: fromChainId,
      symbol,
      name: token.name,
      decimals: token.decimals,
      address: "",
      destAddress: undefined,
      lockable: false,
      detail: "",
    };
    if (chainId === fromChainId && erc20(token.address)) row.address = token.address;
    if (chainId === toChainId && erc20(token.address)) row.destAddress = token.address;
    if (row.name === row.symbol && token.name) row.name = token.name;
    map.set(symbol, row);
  };

  for (const t of catalogSource(fromChainId)) add(fromChainId, t);
  for (const t of catalogSource(toChainId)) add(toChainId, t);

  const rows = [...map.values()].map((row) => {
    const lockable = Boolean(bothGateways && row.address && row.destAddress);
    let detail = "In the imported catalog. Not a live lock pair on this route.";
    if (lockable) {
      detail = "Wallet lock → release. 1:1 after the relayer pays the dest gateway.";
    } else if (!hasGateway(fromChainId) || !hasGateway(toChainId)) {
      detail = `Wallet lock needs a NovaBridgeGateway on both chains. Live today: NovaONE ↔ NRW.`;
    } else if (!row.address || !row.destAddress) {
      detail = "Needs a paired ERC-20 on both the source and destination.";
    }
    return { ...row, lockable, detail };
  });

  rows.sort((a, b) => {
    if (a.lockable !== b.lockable) return a.lockable ? -1 : 1;
    const pa = PRIORITY.indexOf(a.symbol);
    const pb = PRIORITY.indexOf(b.symbol);
    if (pa !== pb) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    return a.symbol.localeCompare(b.symbol);
  });

  return rows;
}

export function bridgeTokensForRoute(fromChainId: number, toChainId: number, pathKind: string): BridgeToken[] {
  if (pathKind === "nova_lock_release" || pathKind === "catalog_lock") {
    return catalogTokensForPair(fromChainId, toChainId);
  }
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
  return catalogTokensForPair(fromChainId, toChainId);
}

export function defaultCatalogToken(fromChainId: number, toChainId: number): CatalogBridgeToken | undefined {
  const rows = catalogTokensForPair(fromChainId, toChainId);
  return rows.find((t) => t.lockable) ?? rows[0];
}
