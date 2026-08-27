import { getAddress, HDNodeWallet, Wallet } from "ethers";
import type { AnyWallet } from "./keystore";
import { deriveAccountAtIndex } from "./accounts";
import { getStoredAddress } from "./keystore";

const KEY = "signet.unlock-session.v1";

interface UnlockSession {
  v: 1;
  mnemonic?: string;
  privateKey?: string;
  accountIndex: number;
  address: string;
  vaultAddress?: string;
  lastActiveAt?: number;
}

function sameAddress(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  try {
    return getAddress(a) === getAddress(b);
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
}

function readStore(store: Storage | undefined): string | null {
  if (!store) return null;
  try {
    return store.getItem(KEY);
  } catch {
    return null;
  }
}

function writeStore(raw: string): void {
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* ignore quota / private mode */
  }
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function readRaw(): string | null {
  return readStore(localStorage) ?? readStore(sessionStorage);
}

export function clearUnlockSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function persist(session: UnlockSession): void {
  writeStore(JSON.stringify(session));
}

export function writeUnlockSession(root: AnyWallet, accountIndex: number, address: string): void {
  const mnemonic = root instanceof HDNodeWallet ? root.mnemonic?.phrase : undefined;
  persist({
    v: 1,
    mnemonic,
    privateKey: root.privateKey,
    accountIndex,
    address,
    vaultAddress: getStoredAddress() ?? address,
    lastActiveAt: Date.now(),
  });
}

let lastActivityWrite = 0;

/** Keep idle auto-lock in sync across refresh. */
export function persistUnlockActivity(): void {
  const now = Date.now();
  if (now - lastActivityWrite < 5_000) return;
  lastActivityWrite = now;
  const raw = readRaw();
  if (!raw) return;
  try {
    const session = JSON.parse(raw) as UnlockSession;
    if (session.v !== 1) return;
    persist({ ...session, lastActiveAt: Date.now() });
  } catch {
    /* ignore */
  }
}

export function restoreUnlockSession(maxIdleMs = 0): { root: AnyWallet; index: number } | null {
  try {
    const raw = readRaw();
    if (!raw) return null;
    const session = JSON.parse(raw) as UnlockSession;
    if (session.v !== 1) {
      clearUnlockSession();
      return null;
    }

    const lastActive = session.lastActiveAt ?? 0;
    if (maxIdleMs > 0 && lastActive > 0 && Date.now() - lastActive > maxIdleMs) {
      clearUnlockSession();
      return null;
    }

    const vaultAddress = getStoredAddress();
    if (session.vaultAddress && vaultAddress && !sameAddress(session.vaultAddress, vaultAddress)) {
      clearUnlockSession();
      return null;
    }

    const index = Number.isFinite(session.accountIndex) ? session.accountIndex : 0;
    let root: AnyWallet;
    const phrase = session.mnemonic?.trim();
    if (phrase && phrase.split(/\s+/).length >= 12) {
      root = HDNodeWallet.fromPhrase(phrase);
    } else if (session.privateKey) {
      root = new Wallet(session.privateKey);
    } else {
      clearUnlockSession();
      return null;
    }

    const derived = deriveAccountAtIndex(root, index);
    if (session.address && !sameAddress(session.address, derived.address)) {
      clearUnlockSession();
      return null;
    }

    persist({ ...session, lastActiveAt: Date.now(), address: derived.address });
    return { root, index };
  } catch {
    clearUnlockSession();
    return null;
  }
}
