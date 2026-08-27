// Signet — trusted remote token lists (URLs only; addresses come from fetched JSON).
// Source URLs mirror docs/04_TOKEN_SOURCES.md (Uniswap, PancakeSwap, chain-native lists).
import { CHAINS } from "./chains";

const CACHE_KEY = "signet.tokenlists.v1";
const WATCHED_KEY = "signet.watchedtokens.v1";
const TTL_MS = 24 * 60 * 60 * 1000;

/** Major symbols scanned by default on public chains (subset of fetched list — not addresses). */
const CURATED_SYMBOLS = new Set([
  "USDC", "USDT", "DAI", "FRAX", "USDE", "PYUSD", "FDUSD", "TUSD",
  "WETH", "ETH", "WBTC", "BTC", "BNB", "WBNB", "TRX", "WTRX",
  "USDT-LEGACY", "USDT-BNB", "USDT-TRC20", "AUSDT", "AUSDC",
  "MATIC", "POL", "WMATIC",
  "LINK", "UNI", "AAVE", "ARB", "OP", "STETH", "WSTETH", "CBETH",
  "USDC.E", "USDT.E", "DAI.E",
]);

/** Trusted remote list endpoints per chain — no token addresses in source. */
const LIST_SOURCES: Partial<Record<number, string>> = {
  1: "https://tokens.uniswap.org",
  56: "https://tokens.pancakeswap.finance/pancakeswap-extended.json",
  137: "https://unpkg.com/quickswap-default-token-list@1.3.26/build/quickswap-default.tokenlist.json",
  42161: "https://token-list.arbitrum.io/ArbTokenLists/arbed_arb_whitelisted_era.json",
  8453: "https://raw.githubusercontent.com/base-org/token-list/main/src/base.tokenlist.json",
  10: "https://static.optimism.io/optimism.tokenlist.json",
  43114: "https://raw.githubusercontent.com/ava-labs/avalanche-bridge-resources/main/token_list.json",
  100: "https://tokens.honeyswap.org/",
};

export interface ListedToken {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  logoURI?: string;
  coingeckoId?: string;
}

interface TokenListJson {
  tokens?: Array<{
    chainId: number;
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    extensions?: {
      coingeckoId?: string;
      coingecko?: { id?: string };
    };
  }>;
}

interface ChainCacheEntry {
  fetchedAt: number;
  tokens: ListedToken[];
}

interface CacheBlob {
  chains: Record<string, ChainCacheEntry>;
}

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function readCacheBlob(): CacheBlob {
  const s = storage();
  if (!s) return { chains: {} };
  try {
    const raw = s.getItem(CACHE_KEY);
    if (!raw) return { chains: {} };
    const parsed = JSON.parse(raw) as CacheBlob;
    return parsed?.chains ? parsed : { chains: {} };
  } catch {
    return { chains: {} };
  }
}

function writeCacheBlob(blob: CacheBlob): void {
  const s = storage();
  if (!s) return;
  s.setItem(CACHE_KEY, JSON.stringify(blob));
}

function readCachedChain(chainId: number): ListedToken[] | null {
  const entry = readCacheBlob().chains[String(chainId)];
  if (!entry?.tokens?.length) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) return null;
  return entry.tokens;
}

function writeCachedChain(chainId: number, tokens: ListedToken[]): void {
  const blob = readCacheBlob();
  blob.chains[String(chainId)] = { fetchedAt: Date.now(), tokens };
  writeCacheBlob(blob);
}

function coingeckoFromExtensions(ext: unknown): string | undefined {
  if (!ext || typeof ext !== "object") return undefined;
  const e = ext as { coingeckoId?: string; coingecko?: { id?: string } };
  return e.coingeckoId ?? e.coingecko?.id;
}

function normalizeEntry(t: NonNullable<TokenListJson["tokens"]>[number]): ListedToken | null {
  if (!t.address || !t.symbol || typeof t.decimals !== "number") return null;
  return {
    address: t.address,
    symbol: t.symbol,
    name: t.name ?? t.symbol,
    decimals: t.decimals,
    logoURI: t.logoURI,
    coingeckoId: coingeckoFromExtensions(t.extensions),
  };
}

async function fetchJsonList(url: string, chainId: number): Promise<ListedToken[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as TokenListJson;
  if (!Array.isArray(json.tokens)) return [];
  const byAddr = new Map<string, ListedToken>();
  for (const raw of json.tokens) {
    if (raw.chainId !== chainId) continue;
    const t = normalizeEntry(raw);
    if (t) byAddr.set(t.address.toLowerCase(), t);
  }
  return [...byAddr.values()];
}

async function loadListForChain(chainId: number): Promise<ListedToken[]> {
  const cached = readCachedChain(chainId);
  if (cached) return cached;

  const url = LIST_SOURCES[chainId];
  if (!url) {
    writeCachedChain(chainId, []);
    return [];
  }

  try {
    const tokens = await fetchJsonList(url, chainId);
    writeCachedChain(chainId, tokens);
    return tokens;
  } catch {
    return [];
  }
}

export function isPublicEvmChain(chainId: number): boolean {
  if (LIST_SOURCES[chainId]) return true;
  const chain = CHAINS.find((c) => c.id === chainId);
  if (chain) return chain.tier === "world" || chain.category === "public" || chain.tier === "partner";
  return false;
}

export function registryTokensForChain(chainId: number): ListedToken[] {
  return registryListedTokens(chainId);
}

function registryListedTokens(chainId: number): ListedToken[] {
  const chain = CHAINS.find((c) => c.id === chainId);
  if (!chain) return [];
  const out: ListedToken[] = [];
  for (const t of chain.tokens) {
    if (t.standard === "native" || t.standard === "meta") continue;
    if (!t.address) continue;
    out.push({
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      address: t.address,
      coingeckoId: t.coingeckoId,
    });
  }
  return out;
}

/** Search trusted token list by name or symbol (case-insensitive). */
export async function searchListedTokens(
  chainId: number,
  query: string,
  limit = 12,
): Promise<ListedToken[]> {
  const q = query.trim().toLowerCase();
  if (!q || q.startsWith("0x")) return [];
  const remote = await getListedTokens(chainId);
  const byAddr = new Map<string, ListedToken>();
  for (const t of [...registryListedTokens(chainId), ...remote]) {
    const key = `${t.symbol.toLowerCase()}:${t.address.toLowerCase()}`;
    if (!byAddr.has(key)) byAddr.set(key, t);
  }
  const matches = [...byAddr.values()].filter(
    (t) => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q),
  );
  return matches.slice(0, limit);
}

/** Full cached list for a public chain (empty when fetch fails or chain is not public). */
export async function getListedTokens(chainId: number): Promise<ListedToken[]> {
  if (!isPublicEvmChain(chainId)) return [];
  return loadListForChain(chainId);
}

export function isCuratedSymbol(symbol: string): boolean {
  return CURATED_SYMBOLS.has(symbol.toUpperCase());
}

/** Curated majors from the fetched list + user-watched addresses (deduped by address). */
export async function getBalanceScanTokens(chainId: number): Promise<ListedToken[]> {
  const full = await getListedTokens(chainId);
  const watched = new Set(getWatchedAddresses(chainId));
  const out = new Map<string, ListedToken>();

  for (const t of full) {
    const key = t.address.toLowerCase();
    if (isCuratedSymbol(t.symbol) || watched.has(key)) {
      out.set(key, t);
    }
  }

  for (const addr of watched) {
    if (!out.has(addr)) {
      const found = full.find((t) => t.address.toLowerCase() === addr);
      if (found) out.set(addr, found);
    }
  }

  return [...out.values()];
}

export function getWatchedAddresses(chainId: number): string[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(WATCHED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return (parsed[String(chainId)] ?? []).map((a) => a.toLowerCase());
  } catch {
    return [];
  }
}

export function addWatchedToken(chainId: number, address: string): void {
  const s = storage();
  if (!s) return;
  const key = String(chainId);
  const addr = address.toLowerCase();
  let parsed: Record<string, string[]> = {};
  try {
    const raw = s.getItem(WATCHED_KEY);
    if (raw) parsed = JSON.parse(raw) as Record<string, string[]>;
  } catch { /* fresh */ }
  const set = new Set(parsed[key] ?? []);
  set.add(addr);
  parsed[key] = [...set];
  s.setItem(WATCHED_KEY, JSON.stringify(parsed));
}
