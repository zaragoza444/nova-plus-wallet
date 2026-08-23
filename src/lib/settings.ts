const SETTINGS_KEY = "signet.settings.v1";
const CHANGE_EVENT = "signet:settings-changed";

export type DisplayCurrency = "USD" | "EUR" | "GBP" | "AUD";

/** Auto-lock after idle period. 0 = disabled. */
export type AutoLockMinutes = 0 | 1 | 5 | 15 | 30 | 60;

export interface SignetSettings {
  autoLockMinutes: AutoLockMinutes;
  displayCurrency: DisplayCurrency;
  /** @deprecated migrated to signet.prefs.v1 — read only for migration */
  hideSmallBalances?: boolean;
}

const DEFAULTS: SignetSettings = {
  autoLockMinutes: 0,
  displayCurrency: "USD",
};

/** Approximate USD → display currency (indicative; balances are priced in USD). */
const FX_FROM_USD: Record<DisplayCurrency, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.55,
};

export const AUTO_LOCK_OPTIONS: { value: AutoLockMinutes; label: string }[] = [
  { value: 1, label: "1 minute" },
  { value: 5, label: "5 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 0, label: "Never" },
];

export const DISPLAY_CURRENCY_OPTIONS: { value: DisplayCurrency; label: string }[] = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
  { value: "AUD", label: "Australian Dollar (AUD)" },
];

/** USD value below which a balance row is hidden when hide-small-balances is on. */
export const HIDE_SMALL_BALANCE_USD = 1;

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function notifySettingsChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribeSettingsChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

function parseSettings(raw: unknown): SignetSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const o = raw as Record<string, unknown>;
  const autoLock = Number(o.autoLockMinutes);
  const validAutoLock = AUTO_LOCK_OPTIONS.some((x) => x.value === autoLock)
    ? (autoLock as AutoLockMinutes)
    : DEFAULTS.autoLockMinutes;
  const currency = o.displayCurrency;
  const validCurrency = DISPLAY_CURRENCY_OPTIONS.some((x) => x.value === currency)
    ? (currency as DisplayCurrency)
    : DEFAULTS.displayCurrency;
  return {
    autoLockMinutes: validAutoLock,
    displayCurrency: validCurrency,
    hideSmallBalances: typeof o.hideSmallBalances === "boolean" ? o.hideSmallBalances : undefined,
  };
}

export function getSettings(): SignetSettings {
  const s = storage();
  if (!s) return { ...DEFAULTS };
  try {
    const raw = s.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return parseSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch: Partial<SignetSettings>): SignetSettings {
  const next = { ...getSettings(), ...patch };
  const s = storage();
  if (s) s.setItem(SETTINGS_KEY, JSON.stringify(next));
  notifySettingsChanged();
  return next;
}

export function getAutoLockMs(): number {
  const mins = getSettings().autoLockMinutes;
  return mins <= 0 ? 0 : mins * 60_000;
}

export function convertUsdToDisplay(usd: number, currency: DisplayCurrency): number {
  return usd * FX_FROM_USD[currency];
}

export function formatFiatEstimate(
  usdValue: number | null,
  currency: DisplayCurrency = getSettings().displayCurrency,
): string {
  if (usdValue == null) return "—";
  const amount = convertUsdToDisplay(usdValue, currency);
  return amount.toLocaleString(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

/** One-time: keep this device signed in across refresh unless the customer locks. */
(function migrateStaySignedIn(): void {
  const s = storage();
  if (!s) return;
  if (s.getItem("signet.migrate.stay-session.v1")) return;
  s.setItem("signet.migrate.stay-session.v1", "1");
  saveSettings({ autoLockMinutes: 0 });
})();
