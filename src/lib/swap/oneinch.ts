// Signet — 1inch v6 swap client. Reads VITE_1INCH_API_KEY; no key => disabled.
import { getChain } from "../chains";
import type { TokenConfig } from "../../types";

const KEY = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_1INCH_API_KEY;
const BASE = "https://api.1inch.dev/swap/v6.0";

/** Mesh / partner chains where 1inch has no aggregator — never fabricate quotes. */
const UNSUPPORTED_CHAIN_IDS = new Set([
  138, // Defi Oracle Meta
  651940, // ALLTRA
  11011, 11012, 11013, 11014, 11015, // Anaka mesh layers
  22016, // NovaONE
  33001, // NRW World
  138, // OneX Chain / DeFi Oracle Meta
]);

/** Public EVM chains 1inch v6 typically aggregates. */
export const ONEINCH_CHAIN_IDS = [1, 56, 42161, 8453, 137, 10, 43114, 100] as const;

export function oneinchConfigured(): boolean {
  return !!KEY;
}

export function isOneInchSwapAvailable(chainId: number): boolean {
  return ONEINCH_CHAIN_IDS.includes(chainId as (typeof ONEINCH_CHAIN_IDS)[number])
    && !UNSUPPORTED_CHAIN_IDS.has(chainId);
}

export function isOneInchUnsupportedNetwork(chainId: number): boolean {
  return UNSUPPORTED_CHAIN_IDS.has(chainId) || !isOneInchSwapAvailable(chainId);
}

export function unsupportedNetworkLabel(chainId: number): string {
  const chain = getChain(chainId);
  return chain ? `${chain.name} (${chainId})` : `Chain ${chainId}`;
}

interface QuoteArgs { chainId: number; src: string; dst: string; amount: string }
interface SwapArgs extends QuoteArgs { from: string; slippage: number }

export async function fetchOneInchQuote(a: QuoteArgs): Promise<{ dstAmount: string } | null> {
  if (!KEY || !isOneInchSwapAvailable(a.chainId)) return null;
  try {
    const url = `${BASE}/${a.chainId}/quote?src=${a.src}&dst=${a.dst}&amount=${a.amount}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
    if (!r.ok) return null;
    return (await r.json()) as { dstAmount: string };
  } catch {
    return null;
  }
}

export async function fetchOneInchSwapTx(
  a: SwapArgs,
): Promise<{ to: string; data: string; value: string } | null> {
  if (!KEY || !isOneInchSwapAvailable(a.chainId)) return null;
  try {
    const url = `${BASE}/${a.chainId}/swap?src=${a.src}&dst=${a.dst}&amount=${a.amount}&from=${a.from}&slippage=${a.slippage}&disableEstimate=true`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
    if (!r.ok) return null;
    const j = (await r.json()) as { tx: { to: string; data: string; value: string } };
    return j.tx;
  } catch {
    return null;
  }
}

/** Verified token addresses for 1inch quotes on public chains (registry fallback). */
const PRESET_SWAP_TOKENS: Record<number, TokenConfig[]> = {
  1: [
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, standard: "erc20" },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, standard: "erc20" },
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, standard: "erc20" },
  ],
  56: [
    { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18, standard: "erc20" },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, standard: "erc20" },
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18, standard: "erc20" },
  ],
  42161: [
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, standard: "erc20" },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, standard: "erc20" },
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6, standard: "erc20" },
  ],
  8453: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, standard: "erc20" },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, standard: "erc20" },
  ],
  137: [
    { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WPOL", name: "Wrapped POL", decimals: 18, standard: "erc20" },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, standard: "erc20" },
  ],
  10: [
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, standard: "erc20" },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6, standard: "erc20" },
  ],
  43114: [
    { address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", symbol: "WAVAX", name: "Wrapped AVAX", decimals: 18, standard: "erc20" },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6, standard: "erc20" },
  ],
  100: [
    { address: "0xe91D153E0b35114BB1fe2D6aC0a3cf378aF360E8", symbol: "WXDAI", name: "Wrapped xDAI", decimals: 18, standard: "erc20" },
    { address: "0xDDAfbb505ad214D573Bae96711eA828678A2330b", symbol: "USDC", name: "USD Coin", decimals: 6, standard: "erc20" },
  ],
};

export function getSwapTokens(chainId: number): TokenConfig[] {
  if (!isOneInchSwapAvailable(chainId)) return [];
  const chain = getChain(chainId);
  const fromRegistry = (chain?.tokens ?? [])
    .filter((t) => t.standard === "erc20" && t.address)
    .map((t) => ({
      address: t.address as string,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      standard: "erc20" as const,
    }));
  if (fromRegistry.length >= 2) return fromRegistry;
  return PRESET_SWAP_TOKENS[chainId] ?? [];
}
