import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  newIdempotencyKey,
  novaBankGetJson,
  novaBankList,
  novaBankMessage,
  novaBankSendJson,
  resolveNovaBankApiBase,
  type NovaBankAccount,
  type NovaBankCard,
  type NovaBankSession,
  type NovaBankTransfer,
  type NovaBankUser,
} from "../lib/nova-bank-api";
import {
  clearNovaBankSession,
  getNovaBankAccessToken,
  getNovaBankProfile,
  getNovaBankRefreshToken,
  saveNovaBankSession,
} from "../lib/nova-bank-session";

interface NovaBankValue {
  ready: boolean;
  apiBase: string | null;
  token: string | null;
  user: NovaBankUser | null;
  accounts: NovaBankAccount[];
  transfers: NovaBankTransfer[];
  cards: NovaBankCard[];
  error: string | null;
  startSession: (email: string, pin: string, fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  transferByAccount: (fromAccountId: string, toAccountNumber: string, amount: string, pin: string, reference?: string) => Promise<void>;
  exchange: (fromAccountId: string, toAccountId: string, fromAmount: string) => Promise<void>;
  issueCard: (linkedAccountId: string, currency: string) => Promise<void>;
}

const Ctx = createContext<NovaBankValue | null>(null);

function asSession(body: unknown): NovaBankSession | null {
  if (!body || typeof body !== "object" || !("accessToken" in body)) return null;
  const rec = body as Partial<NovaBankSession>;
  if (typeof rec.accessToken !== "string" || typeof rec.refreshToken !== "string" || !rec.user) return null;
  return {
    accessToken: rec.accessToken,
    refreshToken: rec.refreshToken,
    user: rec.user,
    accounts: Array.isArray(rec.accounts) ? rec.accounts : [],
  };
}

function userFromMe(body: unknown): { user: NovaBankUser; accounts: NovaBankAccount[] } | null {
  if (!body || typeof body !== "object") return null;
  const rec = body as { user?: NovaBankUser; accounts?: NovaBankAccount[]; email?: string };
  if (rec.user && typeof rec.user.email === "string") {
    return { user: rec.user, accounts: Array.isArray(rec.accounts) ? rec.accounts : [] };
  }
  if (typeof rec.email === "string" && typeof (rec as { id?: string }).id === "string") {
    return { user: rec as unknown as NovaBankUser, accounts: [] };
  }
  return null;
}

export function NovaBankProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false);
  const [apiBase, setApiBase] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(() => getNovaBankAccessToken());
  const [user, setUser] = useState<NovaBankUser | null>(() => getNovaBankProfile());
  const [accounts, setAccounts] = useState<NovaBankAccount[]>([]);
  const [transfers, setTransfers] = useState<NovaBankTransfer[]>([]);
  const [cards, setCards] = useState<NovaBankCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadLists = useCallback(async (base: string, access: string) => {
    const [acc, tx, cd] = await Promise.all([
      novaBankGetJson(`${base}/accounts`, access),
      novaBankGetJson(`${base}/transfers`, access),
      novaBankGetJson(`${base}/cards`, access),
    ]);
    const nextAccounts = novaBankList<NovaBankAccount>(acc, "accounts");
    const nextTransfers = novaBankList<NovaBankTransfer>(tx, "transfers");
    const nextCards = novaBankList<NovaBankCard>(cd, "cards");
    if (acc) setAccounts(nextAccounts);
    if (tx) setTransfers(nextTransfers);
    if (cd) setCards(nextCards);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const base = await resolveNovaBankApiBase();
      if (cancelled) return;
      setApiBase(base);
      const access = getNovaBankAccessToken();
      if (base && access) {
        const me = userFromMe(await novaBankGetJson(`${base}/auth/me`, access));
        if (me) {
          setUser(me.user);
          setToken(access);
          if (me.accounts.length) setAccounts(me.accounts);
          await loadLists(base, access);
        } else {
          const refresh = getNovaBankRefreshToken();
          if (refresh) {
            const result = await novaBankSendJson(`${base}/auth/refresh`, "POST", { refreshToken: refresh });
            const session = result.ok ? asSession(result.body) : null;
            if (session) {
              saveNovaBankSession(session);
              setToken(session.accessToken);
              setUser(session.user);
              setAccounts(session.accounts);
              await loadLists(base, session.accessToken);
            } else {
              clearNovaBankSession();
              setToken(null);
              setUser(null);
            }
          } else {
            clearNovaBankSession();
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
    const base = apiBase ?? (await resolveNovaBankApiBase());
    if (!base) throw new Error("Nova Online Bank API is offline");
    setApiBase(base);
    const result = await novaBankSendJson(
      `${base}/auth/start`,
      "POST",
      { email, pin, fullName },
      { idempotencyKey: newIdempotencyKey("auth") },
    );
    if (!result.ok) throw new Error(novaBankMessage(result.body, "Sign-in failed"));
    const session = asSession(result.body);
    if (!session) throw new Error("Sign-in response was incomplete");
    saveNovaBankSession(session);
    setToken(session.accessToken);
    setUser(session.user);
    setAccounts(session.accounts);
    await loadLists(base, session.accessToken);
  }, [apiBase, loadLists]);

  const logout = useCallback(async () => {
    const refresh = getNovaBankRefreshToken();
    if (apiBase && refresh) {
      await novaBankSendJson(`${apiBase}/auth/logout`, "POST", { refreshToken: refresh }, { token });
    }
    clearNovaBankSession();
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
    const result = await novaBankSendJson(
      `${apiBase}/transfers/by-account`,
      "POST",
      { fromAccountId, toAccountNumber, amount, pin, reference },
      { token, idempotencyKey: newIdempotencyKey("xfer") },
    );
    if (!result.ok) throw new Error(novaBankMessage(result.body, "Transfer failed"));
    await loadLists(apiBase, token);
  }, [apiBase, token, loadLists]);

  const exchange = useCallback(async (fromAccountId: string, toAccountId: string, fromAmount: string) => {
    if (!apiBase || !token) throw new Error("Sign in required");
    const result = await novaBankSendJson(
      `${apiBase}/transfers/exchange`,
      "POST",
      { fromAccountId, toAccountId, fromAmount },
      { token, idempotencyKey: newIdempotencyKey("fx") },
    );
    if (!result.ok) throw new Error(novaBankMessage(result.body, "Exchange failed"));
    await loadLists(apiBase, token);
  }, [apiBase, token, loadLists]);

  const issueCard = useCallback(async (linkedAccountId: string, currency: string) => {
    if (!apiBase || !token) throw new Error("Sign in required");
    const result = await novaBankSendJson(
      `${apiBase}/cards`,
      "POST",
      { linkedAccountId, currency, protocol: "online" },
      { token, idempotencyKey: newIdempotencyKey("card") },
    );
    if (!result.ok) throw new Error(novaBankMessage(result.body, "Card issue failed"));
    await loadLists(apiBase, token);
  }, [apiBase, token, loadLists]);

  const value = useMemo<NovaBankValue>(
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
    }),
    [ready, apiBase, token, user, accounts, transfers, cards, error, startSession, logout, refresh, transferByAccount, exchange, issueCard],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNovaBank(): NovaBankValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNovaBank requires NovaBankProvider");
  return ctx;
}
