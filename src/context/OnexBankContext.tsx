import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  apiMessage,
  onexGetJson,
  onexSendJson,
  resolveOnexApiBase,
  type OnexAccount,
  type OnexCard,
  type OnexSession,
  type OnexTransfer,
} from "../lib/onex-api";
import {
  clearOnexSession,
  getOnexAccessToken,
  getOnexProfile,
  getOnexRefreshToken,
  saveOnexSession,
} from "../lib/onex-session";

interface OnexBankValue {
  ready: boolean;
  apiBase: string | null;
  token: string | null;
  user: OnexSession["user"] | null;
  accounts: OnexAccount[];
  transfers: OnexTransfer[];
  cards: OnexCard[];
  error: string | null;
  startSession: (email: string, pin: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  transferByAccount: (fromAccountId: string, toAccountNumber: string, amount: string, pin: string, reference?: string) => Promise<void>;
  exchange: (fromAccountId: string, toAccountId: string, amount: string) => Promise<void>;
  issueCard: (linkedAccountId: string) => Promise<void>;
  depositAddress: () => Promise<string | null>;
  syncChain: () => Promise<string | null>;
}

const Ctx = createContext<OnexBankValue | null>(null);

export function OnexBankProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false);
  const [apiBase, setApiBase] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(() => getOnexAccessToken());
  const [user, setUser] = useState<OnexSession["user"] | null>(() => getOnexProfile());
  const [accounts, setAccounts] = useState<OnexAccount[]>([]);
  const [transfers, setTransfers] = useState<OnexTransfer[]>([]);
  const [cards, setCards] = useState<OnexCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(async (base: string, access: string) => {
    const [acc, tx, cd] = await Promise.all([
      onexGetJson(`${base}/accounts`, access),
      onexGetJson(`${base}/transfers`, access),
      onexGetJson(`${base}/cards`, access),
    ]);
    const accObj = acc && typeof acc === "object" ? (acc as { accounts?: OnexAccount[] }) : null;
    const txObj = tx && typeof tx === "object" ? (tx as { transfers?: OnexTransfer[] }) : null;
    const cdObj = cd && typeof cd === "object" ? (cd as { cards?: OnexCard[] }) : null;
    if (accObj?.accounts) setAccounts(accObj.accounts);
    if (txObj?.transfers) setTransfers(txObj.transfers);
    if (cdObj?.cards) setCards(cdObj.cards);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const base = await resolveOnexApiBase();
      if (cancelled) return;
      setApiBase(base);
      const access = getOnexAccessToken();
      if (base && access) {
        const me = await onexGetJson(`${base}/auth/me`, access);
        if (me && typeof me === "object" && (me as { user?: OnexSession["user"] }).user) {
          const profile = (me as { user: OnexSession["user"]; accounts?: OnexAccount[] }).user;
          setUser(profile);
          setToken(access);
          if ((me as { accounts?: OnexAccount[] }).accounts) setAccounts((me as { accounts: OnexAccount[] }).accounts);
          await loadLists(base, access);
        } else {
          const refresh = getOnexRefreshToken();
          if (refresh) {
            const result = await onexSendJson(`${base}/auth/refresh`, "POST", { refreshToken: refresh });
            if (result.ok && result.body && typeof result.body === "object" && "accessToken" in result.body) {
              const session = result.body as OnexSession;
              saveOnexSession(session);
              setToken(session.accessToken);
              setUser(session.user);
              setAccounts(session.accounts);
              await loadLists(base, session.accessToken);
            } else {
              clearOnexSession();
              setToken(null);
              setUser(null);
            }
          } else {
            clearOnexSession();
            setToken(null);
            setUser(null);
          }
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLists]);

  const startSession = useCallback(async (email: string, pin: string, fullName?: string) => {
    setError(null);
    const base = apiBase ?? (await resolveOnexApiBase());
    if (!base) throw new Error("OneX Bank API is offline");
    setApiBase(base);
    const result = await onexSendJson(`${base}/auth/start`, "POST", { email, pin, fullName });
    if (!result.ok) throw new Error(apiMessage(result.body, "Sign-in failed"));
    const session = result.body as OnexSession;
    saveOnexSession(session);
    setToken(session.accessToken);
    setUser(session.user);
    setAccounts(session.accounts);
    await loadLists(base, session.accessToken);
  }, [apiBase, loadLists]);

  const logout = useCallback(async () => {
    if (apiBase && token) await onexSendJson(`${apiBase}/auth/logout`, "POST", {}, { token });
    clearOnexSession();
    setToken(null);
    setUser(null);
    setAccounts([]);
    setTransfers([]);
    setCards([]);
  }, [apiBase, token]);

  const refresh = useCallback(async () => {
    if (!apiBase || !token) return;
    await loadLists(apiBase, token);
  }, [apiBase, token, loadLists]);

  const transferByAccount = useCallback(async (fromAccountId: string, toAccountNumber: string, amount: string, pin: string, reference?: string) => {
    if (!apiBase || !token) throw new Error("Sign in required");
    const result = await onexSendJson(
      `${apiBase}/transfers/by-account`,
      "POST",
      { fromAccountId, toAccountNumber, amount, pin, reference },
      { token, idempotencyKey: `xfer-${fromAccountId}-${Date.now()}` },
    );
    if (!result.ok) throw new Error(apiMessage(result.body, "Transfer failed"));
    await loadLists(apiBase, token);
  }, [apiBase, token, loadLists]);

  const exchange = useCallback(async (fromAccountId: string, toAccountId: string, amount: string) => {
    if (!apiBase || !token) throw new Error("Sign in required");
    const result = await onexSendJson(
      `${apiBase}/transfers/exchange`,
      "POST",
      { fromAccountId, toAccountId, amount },
      { token, idempotencyKey: `swap-${fromAccountId}-${Date.now()}` },
    );
    if (!result.ok) throw new Error(apiMessage(result.body, "Swap failed"));
    await loadLists(apiBase, token);
  }, [apiBase, token, loadLists]);

  const issueCard = useCallback(async (linkedAccountId: string) => {
    if (!apiBase || !token) throw new Error("Sign in required");
    const result = await onexSendJson(`${apiBase}/cards`, "POST", { linkedAccountId, currency: "USD" }, { token });
    if (!result.ok) throw new Error(apiMessage(result.body, "Card issue failed"));
    await loadLists(apiBase, token);
  }, [apiBase, token, loadLists]);

  const depositAddress = useCallback(async () => {
    if (!apiBase || !token) return null;
    const body = await onexGetJson(`${apiBase}/onex/wallet/deposit`, token);
    return body && typeof body === "object" ? String((body as { address?: string }).address ?? "") : null;
  }, [apiBase, token]);

  const syncChain = useCallback(async () => {
    if (!apiBase || !token) return null;
    const result = await onexSendJson(`${apiBase}/onex/wallet/sync`, "POST", {}, { token });
    if (!result.ok) throw new Error(apiMessage(result.body, "Sync failed"));
    await loadLists(apiBase, token);
    return result.body && typeof result.body === "object" ? String((result.body as { balance?: string }).balance ?? "") : null;
  }, [apiBase, token, loadLists]);

  const value = useMemo<OnexBankValue>(
    () => ({
      ready,
      apiBase,
      token,
      user,
      accounts,
      transfers,
      cards,
      error,
      startSession,
      logout,
      refresh,
      transferByAccount,
      exchange,
      issueCard,
      depositAddress,
      syncChain,
    }),
    [ready, apiBase, token, user, accounts, transfers, cards, error, startSession, logout, refresh, transferByAccount, exchange, issueCard, depositAddress, syncChain],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnexBank(): OnexBankValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnexBank requires OnexBankProvider");
  return ctx;
}
