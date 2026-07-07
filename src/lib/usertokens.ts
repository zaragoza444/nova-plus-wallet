// Signet — user-added ERC-20 tokens (on-chain verified metadata).
import { Contract, JsonRpcProvider, getAddress, isAddress } from "ethers";

const USER_TOKENS_KEY = "signet.usertokens.v1";
const CHANGE_EVENT = "signet:usertokens-changed";

const ERC20_META_ABI = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
];

export interface UserTokenRecord {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function notifyUserTokensChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribeUserTokensChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function getUserTokens(): UserTokenRecord[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(USER_TOKENS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isUserTokenRecord);
  } catch {
    return [];
  }
}

export function getUserTokensForChain(chainId: number): UserTokenRecord[] {
  return getUserTokens().filter((t) => t.chainId === chainId);
}

function isUserTokenRecord(v: unknown): v is UserTokenRecord {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.chainId === "number" &&
    typeof o.address === "string" &&
    typeof o.symbol === "string" &&
    typeof o.name === "string" &&
    typeof o.decimals === "number"
  );
}

export function tokenRecordKey(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`;
}

export async function fetchTokenMetadata(
  rpcUrl: string,
  tokenAddress: string,
): Promise<{ ok: true; record: Omit<UserTokenRecord, "chainId"> } | { ok: false; message: string }> {
  if (!isAddress(tokenAddress)) {
    return { ok: false, message: "Invalid token address." };
  }
  const address = getAddress(tokenAddress);
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const code = await provider.getCode(address);
    if (!code || code === "0x") {
      return { ok: false, message: "No contract code at this address." };
    }
    const c = new Contract(address, ERC20_META_ABI, provider);
    const [symbol, name, rawDecimals] = await Promise.all([
      c.symbol() as Promise<string>,
      c.name() as Promise<string>,
      c.decimals() as Promise<bigint | number>,
    ]);
    const decimals = Number(rawDecimals);
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
      return { ok: false, message: "Contract did not return valid decimals()." };
    }
    return {
      ok: true,
      record: { address, symbol: String(symbol), name: String(name), decimals },
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Could not read token metadata.",
    };
  }
}

export function saveUserToken(record: UserTokenRecord): void {
  const s = storage();
  if (!s) throw new Error("Storage unavailable.");
  const existing = getUserTokens();
  const key = tokenRecordKey(record.chainId, record.address);
  if (existing.some((t) => tokenRecordKey(t.chainId, t.address) === key)) {
    throw new Error("Token already saved for this network.");
  }
  s.setItem(USER_TOKENS_KEY, JSON.stringify([...existing, record]));
  notifyUserTokensChanged();
}

export function removeUserToken(chainId: number, address: string): void {
  const s = storage();
  if (!s) return;
  const key = tokenRecordKey(chainId, address);
  const next = getUserTokens().filter((t) => tokenRecordKey(t.chainId, t.address) !== key);
  s.setItem(USER_TOKENS_KEY, JSON.stringify(next));
  notifyUserTokensChanged();
}

export async function addUserTokenByAddress(
  chainId: number,
  rpcUrl: string,
  tokenAddress: string,
): Promise<{ ok: true; record: UserTokenRecord } | { ok: false; message: string }> {
  const meta = await fetchTokenMetadata(rpcUrl, tokenAddress);
  if (!meta.ok) return meta;
  const record: UserTokenRecord = { chainId, ...meta.record };
  try {
    saveUserToken(record);
    return { ok: true, record };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not save token." };
  }
}
