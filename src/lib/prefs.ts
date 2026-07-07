// Signet — token visibility preferences (signet.prefs.v1).
import type { TokenBalanceRow } from "../types";
import { getSettings } from "./settings";

const PREFS_KEY = "signet.prefs.v1";
const CHANGE_EVENT = "signet:prefs-changed";

/** Token keys use `chainId:address` (lowercase address) or `chainId:native:SYMBOL`. */
export interface SignetPrefs {
  hideSmallBalances: boolean;
  smallBalanceUsdThreshold: number;
  /** Persisted list; treat as a set of chainId:address keys. */
  hiddenTokens: string[];
  spamFilterEnabled: boolean;
}

const DEFAULTS: SignetPrefs = {
  hideSmallBalances: false,
  smallBalanceUsdThreshold: 1,
  hiddenTokens: [],
  spamFilterEnabled: true,
};

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function notifyPrefsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribePrefsChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

function migrateFromSettings(): Partial<SignetPrefs> {
  const legacy = getSettings();
  return { hideSmallBalances: legacy.hideSmallBalances };
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string");
}

function parsePrefs(raw: unknown): SignetPrefs {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS, ...migrateFromSettings() };
  const o = raw as Record<string, unknown>;

  const threshold = Number(
    o.smallBalanceUsdThreshold ?? o.hideSmallThresholdUsd,
  );

  const hiddenTokens = parseStringList(o.hiddenTokens ?? o.hiddenTokenKeys);

  return {
    hideSmallBalances: Boolean(o.hideSmallBalances ?? migrateFromSettings().hideSmallBalances),
    smallBalanceUsdThreshold:
      Number.isFinite(threshold) && threshold >= 0 ? threshold : DEFAULTS.smallBalanceUsdThreshold,
    hiddenTokens,
    spamFilterEnabled: o.spamFilterEnabled !== false,
  };
}

export function getPrefs(): SignetPrefs {
  const s = storage();
  if (!s) return { ...DEFAULTS, ...migrateFromSettings() };
  try {
    const raw = s.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS, ...migrateFromSettings() };
    return parsePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS, ...migrateFromSettings() };
  }
}

export function savePrefs(patch: Partial<SignetPrefs>): SignetPrefs {
  const next = { ...getPrefs(), ...patch };
  const s = storage();
  if (s) s.setItem(PREFS_KEY, JSON.stringify(next));
  notifyPrefsChanged();
  return next;
}

export function getHiddenTokenSet(prefs: SignetPrefs = getPrefs()): Set<string> {
  return new Set(prefs.hiddenTokens);
}

export function balanceRowKey(row: TokenBalanceRow): string {
  const addr = row.token.address?.toLowerCase();
  return addr ? `${row.chainId}:${addr}` : `${row.chainId}:native:${row.token.symbol.toUpperCase()}`;
}

export function isTokenHidden(row: TokenBalanceRow, prefs: SignetPrefs = getPrefs()): boolean {
  return getHiddenTokenSet(prefs).has(balanceRowKey(row));
}

export function hideToken(row: TokenBalanceRow): void {
  const key = balanceRowKey(row);
  const prefs = getPrefs();
  const hidden = new Set(prefs.hiddenTokens);
  if (hidden.has(key)) return;
  hidden.add(key);
  savePrefs({ hiddenTokens: [...hidden] });
}

export function unhideToken(key: string): void {
  savePrefs({ hiddenTokens: getPrefs().hiddenTokens.filter((k) => k !== key) });
}

export function shouldHideSmallBalance(
  usdEstimate: number | null,
  prefs: SignetPrefs = getPrefs(),
): boolean {
  if (!prefs.hideSmallBalances || usdEstimate == null) return false;
  return usdEstimate > 0 && usdEstimate < prefs.smallBalanceUsdThreshold;
}

/** Zero-value token not in registry / list / user path — treated as spam when filter on. */
export function isSpamToken(row: TokenBalanceRow, listedOrUser: boolean): boolean {
  if (listedOrUser) return false;
  if (row.usdEstimate != null && row.usdEstimate > 0) return false;
  return BigInt(row.balance) > 0n;
}

export function isBalanceRowVisible(
  row: TokenBalanceRow,
  opts: { listedOrUser?: boolean; prefs?: SignetPrefs } = {},
): boolean {
  const prefs = opts.prefs ?? getPrefs();
  if (isTokenHidden(row, prefs)) return false;
  if (shouldHideSmallBalance(row.usdEstimate, prefs)) return false;
  if (prefs.spamFilterEnabled && isSpamToken(row, opts.listedOrUser ?? false)) return false;
  return true;
}

export function filterVisibleRows(
  rows: TokenBalanceRow[],
  opts: { listedOrUserByKey?: Set<string>; prefs?: SignetPrefs } = {},
): TokenBalanceRow[] {
  const prefs = opts.prefs ?? getPrefs();
  return rows.filter((row) => {
    const key = balanceRowKey(row);
    const listedOrUser = opts.listedOrUserByKey?.has(key) ?? false;
    return isBalanceRowVisible(row, { listedOrUser, prefs });
  });
}

export function visibleTotalUsd(rows: TokenBalanceRow[], prefs?: SignetPrefs): number {
  return filterVisibleRows(rows, { prefs }).reduce((s, r) => s + (r.usdEstimate ?? 0), 0);
}
