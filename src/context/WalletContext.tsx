import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import * as ks from "../lib/keystore";
import { DEFAULT_BANKS } from "../lib/keystore";
import type { AccountType, AnyWallet, BankConfig } from "../lib/keystore";
import { DEFAULT_CHAIN_IDS } from "../lib/chains";
import {
  accountDisplayLabel,
  appendAccount,
  deriveAccountAtIndex,
  ensureInitialAccount,
  getAccountManifest,
  getActiveAccountIndex,
  peekNextAccountIndex,
  setAccountLabel,
  setActiveAccountIndex,
  subscribeAccountsChanged,
  walletSupportsHdAccounts,
  wipeAccounts,
  type AccountRecord,
} from "../lib/accounts";
import {
  clearInstitutionalGate,
  isInstitutionalGateUnlocked,
  subscribeInstitutionalGateChanged,
  verifyInstitutionalGate,
} from "../lib/institutionalGate";
import {
  clearStoredActiveChainId,
  getStoredActiveChainId,
  setStoredActiveChainId,
} from "../lib/activeChain";
import { isNovaPlusWalletOwner, NOVA_PLUS_WALLET_OWNER } from "../lib/walletOwner";
import { clearUnlockSession, restoreUnlockSession, writeUnlockSession } from "../lib/unlockSession";
import { getAutoLockMs } from "../lib/settings";

export type WalletStatus = "no-wallet" | "locked" | "unlocked" | "watch-only";
export type WalletMode = "local" | "walletconnect" | "watch" | null;

interface LegacyWallet {
  address: string;
  isConnected: boolean;
  balances: Record<string, string>;
  chainId: number;
}

export interface CreateFinalizeOptions {
  accountType?: AccountType;
}

interface WalletCtxValue {
  status: WalletStatus;
  address: string | null;
  signer: AnyWallet | null;
  chainId: number;
  mode: WalletMode;
  accountType: AccountType;
  isInstitutional: boolean;
  /** Session flag after institutional gate verified. */
  gateUnlocked: boolean;
  /** @deprecated Use gateUnlocked */
  privateUnlocked: boolean;
  banks: BankConfig[];
  activeAccountIndex: number;
  accounts: AccountRecord[];
  supportsHdAccounts: boolean;
  setChainId: (id: number) => void;
  switchAccount: (index: number) => void;
  addAccount: () => Promise<void>;
  renameAccount: (index: number, label: string) => void;
  wallet: LegacyWallet;
  connect: () => void;
  disconnect: () => void;
  beginCreate: () => { mnemonic: string; address: string };
  finalizeCreate: (
    password: string,
    onProgress?: (p: number) => void,
    options?: CreateFinalizeOptions,
  ) => Promise<void>;
  importWallet: (
    secret: string,
    password: string,
    onProgress?: (p: number) => void,
    options?: CreateFinalizeOptions,
  ) => Promise<void>;
  unlock: (password: string, onProgress?: (p: number) => void) => Promise<void>;
  enterInstitutionalGate: (value: string) => Promise<void>;
  /** @deprecated Use enterInstitutionalGate */
  enterPrivateAccess: (value: string) => Promise<void>;
  exitInstitutionalGate: () => void;
  /** @deprecated Use exitInstitutionalGate */
  exitPrivateAccess: () => void;
  changePassword: (
    oldPassword: string,
    newPassword: string,
    onProgress?: (p: number) => void,
  ) => Promise<void>;
  lock: () => void;
  wipe: () => void;
  isWatchOnly: boolean;
  isOwnerWallet: boolean;
  activateOwnerWatch: () => void;
}

let activeWallet: AnyWallet | null = null;
let activeRootWallet: AnyWallet | null = null;

export function getActiveWallet(): AnyWallet | null {
  return activeWallet;
}

const DEFAULT_CHAIN = DEFAULT_CHAIN_IDS[0] ?? 1;
const WalletCtx = createContext<WalletCtxValue | null>(null);

function bootWallet(): { status: WalletStatus; address: string | null; hd: boolean } {
  if (ks.hasVault()) {
    const restored = restoreUnlockSession(getAutoLockMs());
    if (restored) {
      const derived = deriveAccountAtIndex(restored.root, restored.index);
      activeRootWallet = restored.root;
      activeWallet = derived;
      setActiveAccountIndex(restored.index);
      return { status: "unlocked", address: derived.address, hd: walletSupportsHdAccounts(restored.root) };
    }
    return { status: "locked", address: ks.getStoredAddress(), hd: false };
  }
  clearUnlockSession();
  return { status: "no-wallet", address: null, hd: false };
}

const OWNER_WATCH_ACCOUNT: AccountRecord = {
  index: 0,
  address: NOVA_PLUS_WALLET_OWNER,
  label: "Nova Plus Wallet owner",
};

export function WalletProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const bootRef = useRef(bootWallet());
  const boot = bootRef.current;
  const [status, setStatus] = useState<WalletStatus>(boot.status);
  const [address, setAddress] = useState<string | null>(boot.address);
  const [accountType, setAccountType] = useState<AccountType>(() => ks.getAccountType());
  const [chainId, setChainIdState] = useState<number>(() => getStoredActiveChainId() ?? DEFAULT_CHAIN);
  const [activeAccountIndex, setActiveAccountIndexState] = useState(() => getActiveAccountIndex());
  const [accountsTick, setAccountsTick] = useState(0);
  const [gateTick, setGateTick] = useState(0);
  const [hdCapable, setHdCapable] = useState(boot.hd);
  const pending = useRef<AnyWallet | null>(null);

  useEffect(() => subscribeInstitutionalGateChanged(() => setGateTick((n) => n + 1)), []);
  useEffect(() => subscribeAccountsChanged(() => setAccountsTick((n) => n + 1)), []);
  void accountsTick;
  void gateTick;

  const gateUnlocked = isInstitutionalGateUnlocked();
  const accounts = getAccountManifest().accounts;
  const banks =
    gateUnlocked && accountType === "institutional"
      ? DEFAULT_BANKS
      : DEFAULT_BANKS.filter((b) => b.id === "onexbank");

  const applyDerivedAccount = useCallback((root: AnyWallet, index: number) => {
    const derived = deriveAccountAtIndex(root, index);
    activeRootWallet = root;
    activeWallet = derived;
    setActiveAccountIndex(index);
    setActiveAccountIndexState(index);
    setAddress(derived.address);
    setHdCapable(walletSupportsHdAccounts(root));
    writeUnlockSession(root, index, derived.address);
  }, []);

  const setUnlocked = useCallback(
    (root: AnyWallet) => {
      ensureInitialAccount(root.address);
      const index = getActiveAccountIndex();
      applyDerivedAccount(root, index);
      setStatus("unlocked");
      setAccountType(ks.getAccountType());
    },
    [applyDerivedAccount],
  );

  const setChainId = useCallback((id: number) => {
    setChainIdState(id);
    setStoredActiveChainId(id);
  }, []);

  const switchAccount = useCallback(
    (index: number) => {
      if (!activeRootWallet) return;
      applyDerivedAccount(activeRootWallet, index);
    },
    [applyDerivedAccount],
  );

  const addAccount = useCallback(async () => {
    if (!activeRootWallet) throw new Error("Wallet is locked.");
    if (!walletSupportsHdAccounts(activeRootWallet)) {
      throw new Error("This wallet was imported from a private key — only one account is available.");
    }
    const nextIndex = peekNextAccountIndex();
    const derived = deriveAccountAtIndex(activeRootWallet, nextIndex);
    appendAccount(derived.address, nextIndex);
    applyDerivedAccount(activeRootWallet, nextIndex);
  }, [applyDerivedAccount]);

  const renameAccount = useCallback((index: number, label: string) => {
    setAccountLabel(index, label);
  }, []);

  const beginCreate = useCallback(() => {
    const w = ks.createRandomWallet();
    pending.current = w;
    return { mnemonic: w.mnemonic?.phrase ?? "", address: w.address };
  }, []);

  const finalizeCreate = useCallback(
    async (password: string, onProgress?: (p: number) => void, options?: CreateFinalizeOptions) => {
      const w = pending.current;
      if (!w) throw new Error("No pending wallet. Start over from create.");
      const type = options?.accountType ?? "personal";
      await ks.encryptAndStore(w, password, onProgress, type);
      pending.current = null;
      wipeAccounts();
      ensureInitialAccount(w.address);
      setUnlocked(w);
    },
    [setUnlocked],
  );

  const importWallet = useCallback(
    async (
      secret: string,
      password: string,
      onProgress?: (p: number) => void,
      options?: CreateFinalizeOptions,
    ) => {
      const w = ks.walletFromSecret(secret);
      const type = options?.accountType ?? "personal";
      await ks.encryptAndStore(w, password, onProgress, type);
      wipeAccounts();
      ensureInitialAccount(w.address);
      setUnlocked(w);
    },
    [setUnlocked],
  );

  const unlock = useCallback(
    async (password: string, onProgress?: (p: number) => void) => {
      const w = await ks.unlockVault(password, onProgress);
      setUnlocked(w);
    },
    [setUnlocked],
  );

  const enterInstitutionalGate = useCallback(async (value: string) => {
    if (!ks.isInstitutionalAccount()) {
      throw new Error("Institutional gate is only for institutional accounts.");
    }
    await verifyInstitutionalGate(value);
  }, []);

  const exitInstitutionalGate = useCallback(() => {
    clearInstitutionalGate();
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string, onProgress?: (p: number) => void) => {
      const w = await ks.changeVaultPassword(oldPassword, newPassword, onProgress);
      setUnlocked(w);
    },
    [setUnlocked],
  );

  const activateOwnerWatch = useCallback(() => {
    activeWallet = null;
    activeRootWallet = null;
    pending.current = null;
    setHdCapable(false);
    clearInstitutionalGate();
    clearUnlockSession();
    setAccountType("personal");
    setActiveAccountIndexState(0);
    setAddress(null);
    setStatus("no-wallet");
  }, []);

  const lock = useCallback(() => {
    activeWallet = null;
    activeRootWallet = null;
    pending.current = null;
    setHdCapable(false);
    clearInstitutionalGate();
    clearUnlockSession();
    if (ks.hasVault()) {
      setStatus("locked");
      setAddress(ks.getStoredAddress());
      return;
    }
    setAddress(null);
    setStatus("no-wallet");
  }, []);

  const wipe = useCallback(() => {
    ks.wipeVault();
    wipeAccounts();
    clearStoredActiveChainId();
    activeWallet = null;
    activeRootWallet = null;
    pending.current = null;
    clearInstitutionalGate();
    clearUnlockSession();
    setAccountType("personal");
    setActiveAccountIndexState(0);
    setHdCapable(false);
    setChainIdState(DEFAULT_CHAIN);
    setAddress(null);
    setStatus("no-wallet");
  }, []);

  const isWatchOnly = status === "watch-only";
  const isOwnerWallet = isNovaPlusWalletOwner(address);
  const signer = status === "unlocked" ? getActiveWallet() : null;
  const visibleAccounts = isWatchOnly ? [OWNER_WATCH_ACCOUNT] : accounts;

  const wallet: LegacyWallet = {
    address: address ?? "",
    isConnected: status === "unlocked" || isWatchOnly,
    balances: {},
    chainId,
  };

  const value: WalletCtxValue = {
    status,
    address,
    signer,
    chainId,
    mode: status === "unlocked" ? "local" : isWatchOnly ? "watch" : null,
    accountType,
    isInstitutional: accountType === "institutional",
    gateUnlocked: gateUnlocked,
    privateUnlocked: gateUnlocked,
    banks,
    activeAccountIndex,
    accounts: visibleAccounts,
    supportsHdAccounts: hdCapable,
    setChainId,
    switchAccount,
    addAccount,
    renameAccount,
    wallet,
    connect: () => {},
    disconnect: lock,
    beginCreate,
    finalizeCreate,
    importWallet,
    unlock,
    enterInstitutionalGate,
    enterPrivateAccess: enterInstitutionalGate,
    exitInstitutionalGate,
    exitPrivateAccess: exitInstitutionalGate,
    changePassword,
    lock,
    wipe,
    isWatchOnly,
    isOwnerWallet,
    activateOwnerWatch,
  };

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWalletContext(): WalletCtxValue {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWalletContext must be used within WalletProvider");
  return ctx;
}

export { accountDisplayLabel };
