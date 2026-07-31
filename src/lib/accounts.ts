// Signet — HD account manifest (addresses are public; keys stay in encrypted vault).
import { HDNodeWallet, type Mnemonic } from "ethers";
import type { AnyWallet } from "./keystore";

const MANIFEST_KEY = "signet.accounts.v1";
const CHANGE_EVENT = "signet:accounts-changed";

export interface AccountRecord {
  index: number;
  address: string;
  label?: string;
}

export interface AccountManifest {
  activeIndex: number;
  accounts: AccountRecord[];
}

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function notifyAccountsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribeAccountsChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

function readManifest(): AccountManifest {
  const s = storage();
  if (!s) return { activeIndex: 0, accounts: [] };
  try {
    const raw = s.getItem(MANIFEST_KEY);
    if (!raw) return { activeIndex: 0, accounts: [] };
    const parsed = JSON.parse(raw) as Partial<AccountManifest>;
    const accounts = Array.isArray(parsed.accounts)
      ? parsed.accounts.filter(
          (a): a is AccountRecord =>
            !!a &&
            typeof a === "object" &&
            typeof a.index === "number" &&
            typeof a.address === "string",
        )
      : [];
    const activeIndex =
      typeof parsed.activeIndex === "number" && accounts.some((a) => a.index === parsed.activeIndex)
        ? parsed.activeIndex
        : (accounts[0]?.index ?? 0);
    return { activeIndex, accounts };
  } catch {
    return { activeIndex: 0, accounts: [] };
  }
}

function writeManifest(manifest: AccountManifest): void {
  const s = storage();
  if (!s) return;
  s.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  notifyAccountsChanged();
}

export function getAccountManifest(): AccountManifest {
  return readManifest();
}

export function getActiveAccountIndex(): number {
  return readManifest().activeIndex;
}

export function getAccountRecords(): AccountRecord[] {
  return readManifest().accounts;
}

export function accountDisplayLabel(record: AccountRecord): string {
  if (record.label?.trim()) return record.label.trim();
  return `Account ${record.index + 1}`;
}

/** Seed manifest on first unlock when migrating single-account vaults. */
export function ensureInitialAccount(address: string): void {
  const manifest = readManifest();
  if (manifest.accounts.length) return;
  writeManifest({
    activeIndex: 0,
    accounts: [{ index: 0, address }],
  });
}

export function setActiveAccountIndex(index: number): void {
  const manifest = readManifest();
  if (!manifest.accounts.some((a) => a.index === index)) return;
  writeManifest({ ...manifest, activeIndex: index });
}

export function setAccountLabel(index: number, label: string): void {
  const manifest = readManifest();
  const trimmed = label.trim();
  writeManifest({
    ...manifest,
    accounts: manifest.accounts.map((a) =>
      a.index === index ? { ...a, label: trimmed || undefined } : a,
    ),
  });
}

export function appendAccount(address: string, index: number): void {
  const manifest = readManifest();
  if (manifest.accounts.some((a) => a.index === index)) return;
  writeManifest({
    activeIndex: index,
    accounts: [...manifest.accounts, { index, address }].sort((a, b) => a.index - b.index),
  });
}

export function wipeAccounts(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(MANIFEST_KEY);
  notifyAccountsChanged();
}

export function walletSupportsHdAccounts(wallet: AnyWallet): boolean {
  return wallet instanceof HDNodeWallet && Boolean(wallet.mnemonic?.phrase);
}

/** BIP44 Ethereum path — account index 0 is the default first address. */
export function deriveAccountAtIndex(root: AnyWallet, index: number): AnyWallet {
  const mnemonic = root instanceof HDNodeWallet ? root.mnemonic : null;
  const phrase = mnemonic?.phrase;
  if (!phrase) {
    if (index !== 0) {
      throw new Error("Multi-account requires a wallet created from a recovery phrase.");
    }
    return root;
  }
  const path = `m/44'/60'/0'/0/${index}`;
  const opts = mnemonic as Mnemonic | null;
  return HDNodeWallet.fromPhrase(phrase, opts?.password, path);
}

export function peekNextAccountIndex(): number {
  const manifest = readManifest();
  if (!manifest.accounts.length) return 0;
  return Math.max(...manifest.accounts.map((a) => a.index)) + 1;
}
