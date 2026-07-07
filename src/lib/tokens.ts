// Signet — resolve registry token metadata by chain + symbol.
import type { ChainDef } from "./chains";
import { getAllChains } from "./networks";

export interface ResolvedToken {
  chainId: number;
  chainName: string;
  chain: ChainDef;
  symbol: string;
  name: string;
  decimals: number;
  /** Undefined for the chain native gas token. */
  address?: string;
  usd?: number;
  coingeckoId?: string;
  iconColor: string;
}

export function resolveToken(chainId: number, symbol: string): ResolvedToken | null {
  const chain = getAllChains().find((c) => c.id === chainId);
  if (!chain) return null;

  const sym = symbol.trim();
  const upper = sym.toUpperCase();
  const nc = chain.nativeCurrency;

  if (nc.symbol.toUpperCase() === upper || nc.name.toUpperCase() === upper) {
    return {
      chainId: chain.id,
      chainName: chain.name,
      chain,
      symbol: nc.symbol,
      name: nc.name,
      decimals: nc.decimals,
      usd: nc.usd,
      coingeckoId: nc.coingeckoId,
      iconColor: chain.iconColor,
    };
  }

  const token = chain.tokens.find((t) => t.symbol.toUpperCase() === upper);
  if (!token) return null;

  return {
    chainId: chain.id,
    chainName: chain.name,
    chain,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    address: token.address ?? undefined,
    usd: token.usd,
    coingeckoId: token.coingeckoId,
    iconColor: chain.iconColor,
  };
}
