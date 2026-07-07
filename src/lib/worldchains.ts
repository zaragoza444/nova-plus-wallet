// Top-15 EVM chains loaded from chainid.network (not hand-typed).
import type { ChainDef } from "./chains";

const CACHE_KEY = "signet.worldchains.v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CHAINLIST_URL = "https://chainid.network/chains.json";

/** Top-15 EVM chain IDs per build spec (toggleable, off by default). */
export const WORLD_CHAIN_IDS = [
  1, 56, 42161, 8453, 137, 10, 43114, 324, 59144, 534352, 5000, 81457, 100, 42220, 25,
] as const;

interface ChainListEntry {
  name: string;
  chainId: number;
  rpc?: string[];
  nativeCurrency?: { name: string; symbol: string; decimals: number };
  explorers?: { url: string }[];
}

interface CacheBlob {
  at: number;
  chains: ChainDef[];
}

const ICON_COLORS: Record<number, string> = {
  324: "#8B5CF6",
  59144: "#62688F",
  534352: "#FF0420",
  5000: "#001742",
  81457: "#0052FF",
  42220: "#FCFF52",
  25: "#000000",
};

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function readCache(): ChainDef[] | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheBlob;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed.chains;
  } catch {
    return null;
  }
}

function writeCache(chains: ChainDef[]): void {
  const s = storage();
  if (!s) return;
  s.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), chains }));
}

function entryToDef(entry: ChainListEntry, builtinIds: Set<number>): ChainDef | null {
  if (builtinIds.has(entry.chainId)) return null;
  const rpc = (entry.rpc ?? []).filter((u) => u.startsWith("http"));
  if (!rpc.length) return null;
  const nc = entry.nativeCurrency;
  if (!nc?.symbol || typeof nc.decimals !== "number") return null;
  return {
    id: entry.chainId,
    name: entry.name,
    slug: `world-${entry.chainId}`,
    nativeCurrency: { name: nc.name, symbol: nc.symbol, decimals: nc.decimals },
    rpcUrls: [rpc[0]],
    blockExplorerUrls: entry.explorers?.[0]?.url ? [entry.explorers[0].url] : [],
    iconColor: ICON_COLORS[entry.chainId] ?? "#6B7280",
    category: "public",
    tier: "world",
    isDefault: false,
    isInternal: false,
    tokens: [],
  };
}

/** Synchronous read of cached world chains (may be empty until fetch completes). */
export function getCachedWorldChains(builtinIds: Set<number>): ChainDef[] {
  const cached = readCache();
  if (!cached) return [];
  return cached.filter((c) => !builtinIds.has(c.id));
}

/** Fetch chainid.network and cache world-tier chains not already in the registry. */
export async function loadWorldChains(builtinIds: Set<number>): Promise<ChainDef[]> {
  const cached = readCache();
  if (cached) return cached.filter((c) => !builtinIds.has(c.id));

  try {
    const res = await fetch(CHAINLIST_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = (await res.json()) as ChainListEntry[];
    const wanted = new Set<number>(WORLD_CHAIN_IDS);
    const out: ChainDef[] = [];
    for (const entry of list) {
      if (!wanted.has(entry.chainId)) continue;
      const def = entryToDef(entry, builtinIds);
      if (def) out.push(def);
    }
    writeCache(out);
    return out;
  } catch {
    return [];
  }
}

export function subscribeWorldChainsReady(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("signet:worldchains-ready", fn);
  return () => window.removeEventListener("signet:worldchains-ready", fn);
}

export function notifyWorldChainsReady(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("signet:worldchains-ready"));
  }
}
