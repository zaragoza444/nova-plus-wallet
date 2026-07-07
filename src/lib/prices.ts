// Signet — layered USD resolver: peg → CoinGecko → oracle fallback → null.
import { formatFiatEstimate } from "./settings";
import { oracleUnitPrice } from "./oracle";

const CG_BASE = "https://api.coingecko.com/api/v3/simple/price";
const CG_CHART_BASE = "https://api.coingecko.com/api/v3/coins";
const CACHE_TTL_MS = 60_000;

export interface TokenQuote {
  priceUsd: number | null;
  change24hPct: number | null;
}

interface QuoteCacheEntry {
  at: number;
  quotes: Map<string, { usd: number; change24h: number | null }>;
}

let quoteCache: QuoteCacheEntry | null = null;

export interface PriceResolveInput {
  symbol: string;
  units: number;
  /** Fixed USD peg from registry (`token.usd`). */
  usd?: number;
  coingeckoId?: string;
}

interface CacheEntry {
  at: number;
  prices: Map<string, number>;
}

let cache: CacheEntry | null = null;
let inflight: Promise<Map<string, number>> | null = null;

function mergeCache(fetched: Map<string, number>): Map<string, number> {
  const merged = new Map(cache?.prices ?? []);
  for (const [id, price] of fetched) merged.set(id, price);
  cache = { at: Date.now(), prices: merged };
  return merged;
}

async function fetchFromCoinGecko(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!ids.length) return out;
  try {
    const url = `${CG_BASE}?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd`;
    const res = await fetch(url);
    if (!res.ok) return out;
    const json = (await res.json()) as Record<string, { usd?: number }>;
    for (const id of ids) {
      const usd = json[id]?.usd;
      if (typeof usd === "number" && Number.isFinite(usd)) out.set(id, usd);
    }
  } catch { /* network error — fall through to oracle/null */ }
  return out;
}

/** Batch-fetch CoinGecko USD prices; responses cached ~60s. */
export async function fetchCoinGeckoPrices(ids: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();

  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    const hit = new Map<string, number>();
    const missing: string[] = [];
    for (const id of unique) {
      const p = cache.prices.get(id);
      if (p != null) hit.set(id, p);
      else missing.push(id);
    }
    if (!missing.length) return hit;
    if (inflight) {
      const fetched = await inflight;
      for (const id of unique) {
        const p = fetched.get(id);
        if (p != null) hit.set(id, p);
      }
      return hit;
    }
    inflight = fetchFromCoinGecko(missing).then((fetched) => mergeCache(fetched));
    const fetched = await inflight;
    inflight = null;
    for (const id of unique) {
      const p = fetched.get(id);
      if (p != null) hit.set(id, p);
    }
    return hit;
  }

  if (inflight) return inflight;
  inflight = fetchFromCoinGecko(unique).then((fetched) => mergeCache(fetched));
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** Resolve USD value: peg → CoinGecko → oracle map → null. */
export function resolveUsd(input: PriceResolveInput, cgPrices: Map<string, number>): number | null {
  if (input.usd != null) return input.units * input.usd;
  if (input.coingeckoId) {
    const unit = cgPrices.get(input.coingeckoId);
    if (unit != null) return input.units * unit;
  }
  const unit = oracleUnitPrice(input.symbol);
  if (unit != null) return input.units * unit;
  return null;
}

export function collectCoinGeckoIds(inputs: PriceResolveInput[]): string[] {
  return [
    ...new Set(
      inputs
        .filter((i) => i.usd == null && i.coingeckoId)
        .map((i) => i.coingeckoId as string),
    ),
  ];
}

export function formatUsdEstimate(value: number | null): string {
  return formatFiatEstimate(value);
}

export async function resolveUsdBatch(
  inputs: PriceResolveInput[],
): Promise<(number | null)[]> {
  const cgPrices = await fetchCoinGeckoPrices(collectCoinGeckoIds(inputs));
  return inputs.map((input) => resolveUsd(input, cgPrices));
}

async function fetchQuotesFromCoinGecko(
  ids: string[],
): Promise<Map<string, { usd: number; change24h: number | null }>> {
  const out = new Map<string, { usd: number; change24h: number | null }>();
  if (!ids.length) return out;
  try {
    const url = `${CG_BASE}?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    if (!res.ok) return out;
    const json = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
    for (const id of ids) {
      const row = json[id];
      if (row && typeof row.usd === "number" && Number.isFinite(row.usd)) {
        out.set(id, {
          usd: row.usd,
          change24h: typeof row.usd_24h_change === "number" ? row.usd_24h_change : null,
        });
      }
    }
  } catch { /* fall through */ }
  return out;
}

/** Live USD price + 24h change from CoinGecko (cached ~60s). */
export async function fetchCoinGeckoQuotes(ids: string[]): Promise<Map<string, { usd: number; change24h: number | null }>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();

  const now = Date.now();
  if (quoteCache && now - quoteCache.at < CACHE_TTL_MS) {
    const hit = new Map<string, { usd: number; change24h: number | null }>();
    const missing: string[] = [];
    for (const id of unique) {
      const q = quoteCache.quotes.get(id);
      if (q) hit.set(id, q);
      else missing.push(id);
    }
    if (!missing.length) return hit;
    const fetched = await fetchQuotesFromCoinGecko(missing);
    const merged = new Map(quoteCache.quotes);
    for (const [id, q] of fetched) merged.set(id, q);
    quoteCache = { at: Date.now(), quotes: merged };
    for (const id of unique) {
      const q = merged.get(id);
      if (q) hit.set(id, q);
    }
    return hit;
  }

  const fetched = await fetchQuotesFromCoinGecko(unique);
  quoteCache = { at: Date.now(), quotes: fetched };
  return fetched;
}

/** Resolve unit price + 24h change: peg → CoinGecko → oracle (no synthetic 24h). */
export async function resolveTokenQuote(input: PriceResolveInput): Promise<TokenQuote> {
  if (input.usd != null) {
    return { priceUsd: input.usd, change24hPct: 0 };
  }
  if (input.coingeckoId) {
    const quotes = await fetchCoinGeckoQuotes([input.coingeckoId]);
    const q = quotes.get(input.coingeckoId);
    if (q) return { priceUsd: q.usd, change24hPct: q.change24h };
  }
  const unit = oracleUnitPrice(input.symbol);
  if (unit != null) return { priceUsd: unit, change24hPct: null };
  return { priceUsd: null, change24hPct: null };
}

export interface ChartPoint {
  t: number;
  price: number;
}

/** CoinGecko market_chart — returns null on failure (never synthetic data). */
export async function fetchCoinGeckoMarketChart(
  coingeckoId: string,
  days: number = 7,
): Promise<ChartPoint[] | null> {
  try {
    const url = `${CG_CHART_BASE}/${encodeURIComponent(coingeckoId)}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { prices?: [number, number][] };
    if (!Array.isArray(json.prices) || !json.prices.length) return null;
    return json.prices.map(([t, price]) => ({ t, price }));
  } catch {
    return null;
  }
}

export function formatChange24h(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
