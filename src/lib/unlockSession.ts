import { HDNodeWallet, Wallet } from "ethers";
import type { AnyWallet } from "./keystore";
import { deriveAccountAtIndex } from "./accounts";

const KEY = "signet.unlock-session.v1";

interface UnlockSession {
  v: 1;
  mnemonic?: string;
  privateKey?: string;
  accountIndex: number;
  address: string;
}

export function clearUnlockSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function writeUnlockSession(root: AnyWallet, accountIndex: number, address: string): void {
  try {
    const mnemonic = root instanceof HDNodeWallet ? root.mnemonic?.phrase : undefined;
    const session: UnlockSession = {
      v: 1,
      mnemonic,
      privateKey: root.privateKey,
      accountIndex,
      address,
    };
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function restoreUnlockSession(): { root: AnyWallet; index: number } | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as UnlockSession;
    if (session.v !== 1) {
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
    deriveAccountAtIndex(root, index);
    return { root, index };
  } catch {
    clearUnlockSession();
    return null;
  }
}
