/** NovaONE / NRW World market pair resolution against live exchangeInfo symbols. */

const QUOTE_ASSETS = ["USDC", "USDT", "NOVA", "NRW"] as const;

export interface NovaOneResolvedPair {
  symbol: string;
  base: string;
  quote: string;
  fromIsBase: boolean;
}

const ALIAS: Record<string, string> = {
  WETH: "ETH",
  WBTC: "BTC",
  WBNB: "BNB",
  WTRX: "TRX",
  AUSDC: "USDC",
  AUSDT: "USDT",
  CUSDC: "USDC",
  CUSDT: "USDT",
};

export function normalizeMarketAsset(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  return ALIAS[upper] ?? upper;
}

export function resolveNovaOnePair(fromSymbol: string, toSymbol: string): NovaOneResolvedPair | null {
  const from = normalizeMarketAsset(fromSymbol);
  const to = normalizeMarketAsset(toSymbol);
  if (!from || !to || from === to) return null;

  if ((QUOTE_ASSETS as readonly string[]).includes(to)) {
    return { symbol: `${from}${to}`, base: from, quote: to, fromIsBase: true };
  }
  if ((QUOTE_ASSETS as readonly string[]).includes(from)) {
    return { symbol: `${to}${from}`, base: to, quote: from, fromIsBase: false };
  }
  return null;
}

/** Production USD refs used when the live book is unavailable (matches NovaONE market service pegs). */
export const SETTLEMENT_USD_REF: Record<string, number> = {
  NOVA: 1,
  NRW: 1,
  USD: 1,
  USDC: 1,
  USDT: 1,
  AUSDC: 1,
  AUSDT: 1,
  CUSDC: 1,
  CUSDT: 1,
  KUSD: 1,
  EUR: 1.08,
  GBP: 1.27,
  AUD: 0.65,
  CHF: 1.12,
  JPY: 0.0067,
  SDG: 0.0017,
  CNY: 0.14,
};

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function asNumberString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}
