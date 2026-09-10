/** Decimal money helpers — fiat uses 2 dp, ETH uses 18. */

export function parseUnits(value, decimals) {
  const raw = String(value ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) throw new Error("Invalid amount");
  const [whole, frac = ""] = raw.split(".");
  if (frac.length > decimals) throw new Error("Too many decimal places");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const n = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0");
  if (n <= 0n) throw new Error("Amount must be greater than zero");
  return n;
}

export function formatUnits(units, decimals) {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = (abs % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  const text = frac ? `${whole}.${frac}` : whole.toString();
  return neg ? `-${text}` : text;
}

export function addUnits(a, b) {
  return a + b;
}

export function subUnits(a, b) {
  if (b > a) throw new Error("Insufficient funds");
  return a - b;
}

export const FIAT_DECIMALS = 2;
export const ETH_DECIMALS = 18;

export function decimalsFor(currency) {
  return currency === "ETH" ? ETH_DECIMALS : FIAT_DECIMALS;
}
