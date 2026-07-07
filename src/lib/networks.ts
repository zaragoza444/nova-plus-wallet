// Signet — persisted enabled networks + user-added custom chains.
import {
  BUILTIN_CHAIN_IDS,
  CHAINS,
  DEFAULT_CHAIN_IDS,
  getBrowserReachableChains,
  isPrivateBankingChain,
  type ChainDef,
} from "./chains";
import { isPrivateUnlocked, subscribePrivateAccessChanged } from "./privateAccess";
import { getCachedWorldChains, loadWorldChains, notifyWorldChainsReady, subscribeWorldChainsReady } from "./worldchains";
import { JsonRpcProvider } from "ethers";

export const ENABLED_KEY = "signet.networks.v1";
export const USER_CHAINS_KEY = "signet.userchains.v1";

const CONFIRM = "NEEDS_CONFIRM";
const CHANGE_EVENT = "signet:networks-changed";

export interface UserChainRecord {
  id: number;
  name: string;
  rpcUrl: string;
  symbol: string;
  decimals: number;
  explorer: string;
}

function safeStorage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function notifyNetworksChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribeNetworksChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function getEnabledChainIds(): number[] {
  const storage = safeStorage();
  if (storage) {
    try {
      const raw = storage.getItem(ENABLED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "number")) {
          return parsed;
        }
      }
    } catch { /* fall through */ }
  }
  return [...DEFAULT_CHAIN_IDS];
}

export function setEnabledChainIds(ids: number[]): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(ENABLED_KEY, JSON.stringify(ids));
  notifyNetworksChanged();
}

export function isChainEnabled(id: number): boolean {
  return getEnabledChainIds().includes(id);
}

/** Toggle a non-internal chain on/off. Internal mesh chains cannot be toggled. */
export function toggleEnabledChainId(id: number): void {
  const chain = getAllChains().find((c) => c.id === id);
  if (!chain || chain.isInternal) return;
  const current = getEnabledChainIds();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  setEnabledChainIds(next);
}

export function getUserChains(): UserChainRecord[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(USER_CHAINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUserChainRecord);
  } catch {
    return [];
  }
}

function isUserChainRecord(v: unknown): v is UserChainRecord {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    typeof o.name === "string" &&
    typeof o.rpcUrl === "string" &&
    typeof o.symbol === "string" &&
    typeof o.decimals === "number" &&
    typeof o.explorer === "string"
  );
}

export function userChainToDef(u: UserChainRecord): ChainDef {
  return {
    id: u.id,
    name: u.name,
    slug: `custom-${u.id}`,
    nativeCurrency: { name: u.symbol, symbol: u.symbol, decimals: u.decimals },
    rpcUrls: [u.rpcUrl],
    blockExplorerUrls: u.explorer ? [u.explorer] : [],
    iconColor: "#6B7280",
    category: "public",
    tier: "world",
    isDefault: false,
    isInternal: false,
    tokens: [{ symbol: u.symbol, name: u.name, decimals: u.decimals, address: null, standard: "native" }],
  };
}

function filterByPrivateAccess(chains: ChainDef[]): ChainDef[] {
  if (isPrivateUnlocked()) return chains;
  return chains.filter((c) => !isPrivateBankingChain(c));
}

export function getAllChains(): ChainDef[] {
  const user = getUserChains().map(userChainToDef);
  const userIds = new Set(user.map((c) => c.id));
  const builtin = CHAINS.filter((c) => !userIds.has(c.id));
  const world = getCachedWorldChains(BUILTIN_CHAIN_IDS);
  return filterByPrivateAccess([...builtin, ...world, ...user]);
}

/** Kick off chainid.network fetch; call once at app boot. */
export function bootstrapWorldChains(): void {
  void loadWorldChains(BUILTIN_CHAIN_IDS).then(() => notifyWorldChainsReady());
}

export { subscribePrivateAccessChanged, subscribeWorldChainsReady };

export function getDefaultTierChains(): ChainDef[] {
  return getAllChains().filter((c) => c.isDefault);
}

export function getPublicEvmChains(): ChainDef[] {
  return filterByPrivateAccess(getAllChains()).filter((c) => c.tier === "world" || c.category === "public");
}

export function getWorldChains(): ChainDef[] {
  return filterByPrivateAccess(getAllChains()).filter((c) => c.tier === "world");
}

export function getPartnerChains(): ChainDef[] {
  return filterByPrivateAccess(getAllChains()).filter((c) => c.tier === "partner");
}

export function getPrivateBankingChains(): ChainDef[] {
  if (!isPrivateUnlocked()) return [];
  return getAllChains().filter((c) => c.tier === "private-banking");
}

export function getInternalMeshChains(): ChainDef[] {
  return CHAINS.filter((c) => c.isInternal && !c.isDefault);
}

export function getCustomChains(): ChainDef[] {
  return getUserChains().map(userChainToDef);
}

export function getEnabledChains(): ChainDef[] {
  const enabled = new Set(getEnabledChainIds());
  return getAllChains().filter((c) => enabled.has(c.id) && !c.isInternal);
}

/** Enabled chains that pass the same reachability rules as getBrowserReachableChains(). */
export function getBrowserReachableEnabledChains(): ChainDef[] {
  const reachableIds = new Set(getBrowserReachableChains().map((c) => c.id));
  return getEnabledChains().filter((c) => {
    if (isPrivateBankingChain(c) && !isPrivateUnlocked()) return false;
    if (!c.rpcUrls.length || c.rpcUrls.includes(CONFIRM)) return false;
    const isBuiltin = CHAINS.some((b) => b.id === c.id);
    if (isBuiltin) return reachableIds.has(c.id);
    return true;
  });
}

/** Contract alias for enabled + browser-reachable chains. */
export const getEnabledReachableChains = getBrowserReachableEnabledChains;

/** Contract alias for toggle + subscribe. */
export const toggleEnabled = toggleEnabledChainId;
export const subscribe = subscribeNetworksChanged;

/** Verify RPC responds and eth_chainId matches the expected chain id. */
export async function validateChainRpc(
  rpcUrl: string,
  expectedChainId: number,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    await Promise.race([
      provider.getBlockNumber(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("RPC timed out after 8 seconds.")), 8_000)),
    ]);
    const hexChainId = (await provider.send("eth_chainId", [])) as string;
    const reported = Number(BigInt(hexChainId));
    if (!Number.isFinite(reported)) {
      return { ok: false, message: "RPC returned an invalid eth_chainId." };
    }
    if (reported !== expectedChainId) {
      return {
        ok: false,
        message: `RPC reported chain ID ${reported}, but you entered ${expectedChainId}. Check the chain ID and RPC URL.`,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Could not reach RPC endpoint.",
    };
  }
}

export function addUserChain(record: UserChainRecord): void {
  const storage = safeStorage();
  if (!storage) throw new Error("Storage unavailable.");
  const existing = getUserChains();
  if (existing.some((c) => c.id === record.id)) {
    throw new Error(`Chain ID ${record.id} is already registered.`);
  }
  if (CHAINS.some((c) => c.id === record.id)) {
    throw new Error(`Chain ID ${record.id} conflicts with a built-in network.`);
  }
  storage.setItem(USER_CHAINS_KEY, JSON.stringify([...existing, record]));
  notifyNetworksChanged();
}

export function removeUserChain(id: number): void {
  const storage = safeStorage();
  if (!storage) return;
  const next = getUserChains().filter((c) => c.id !== id);
  storage.setItem(USER_CHAINS_KEY, JSON.stringify(next));
  notifyNetworksChanged();
}

export function validateUserChainInput(input: {
  id: string;
  name: string;
  rpcUrl: string;
  symbol: string;
  decimals: string;
  explorer: string;
}): { ok: true; record: UserChainRecord } | { ok: false; message: string } {
  const id = Number(input.id);
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Chain ID must be a positive integer." };
  }
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Network name is required." };
  const rpcUrl = input.rpcUrl.trim();
  if (!/^https?:\/\/.+/i.test(rpcUrl)) {
    return { ok: false, message: "RPC URL must start with http:// or https://." };
  }
  const symbol = input.symbol.trim();
  if (!symbol) return { ok: false, message: "Native symbol is required." };
  const decimals = Number(input.decimals);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    return { ok: false, message: "Decimals must be an integer from 0 to 18." };
  }
  const explorer = input.explorer.trim();
  if (explorer && !/^https?:\/\/.+/i.test(explorer)) {
    return { ok: false, message: "Explorer URL must start with http:// or https://." };
  }
  return {
    ok: true,
    record: { id, name, rpcUrl, symbol, decimals, explorer },
  };
}
