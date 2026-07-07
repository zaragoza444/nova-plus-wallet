// Signet — USD estimate oracle (fallback unit prices only).
// Stablecoins use the token's `usd` peg in the registry; gold/palladium/fiat-wraps
// are blocked here so the UI shows "—" instead of a fabricated value.
const USD: Record<string, number> = {
  ETH: 3500,
  WETH: 3500,
  BTC: 65000,
  CBTC: 65000,
  CBTCONBSC: 65000,
  WBTC: 65000,
};

/** Symbols that must never receive an oracle fallback price. */
const BLOCKLIST = new Set([
  "CXAUC",
  "LIXAU",
  "LIPMG",
  "WEUR",
  "WGBP",
  "WAUD",
  "WJPY",
  "WCHF",
  "WSGD",
  "EMEUR",
  "EMGBP",
  "EMAUD",
  "EMUSD",
  "EMJPY",
  "EMCHF",
]);

/** Per-unit USD price from the static map, or null if unknown / blocked. */
export function oracleUnitPrice(symbol: string): number | null {
  if (!symbol) return null;
  const key = symbol.toUpperCase();
  if (BLOCKLIST.has(key)) return null;
  return USD[key] ?? null;
}

/** @deprecated Prefer resolveUsd from ./prices.ts */
export function estimateUsdForUnits(symbol: string, units: number): number | null {
  const price = oracleUnitPrice(symbol);
  if (price == null) return null;
  return price * units;
}
