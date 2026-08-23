/** Quotes against Nova settlement-meta liquidity (Marionette / m2 rails). */

import { getChain } from "../chains";
import {
  ALLOWED_NOVA_API_HOSTS,
  getSettlementRail,
  isSettlementMetaChain,
  type SettlementMetaRail,
} from "../settlement-meta";

export interface MetaLiquidityStatus {
  chainId: number;
  name: string;
  connected: boolean;
  liquidity: "nova-settlement-meta";
  settlement: "meta";
  swapRouter: string;
  wrappedBridge: string;
  hubConnected?: boolean;
}

export interface MetaQuote {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
  amountOut?: string;
  price?: string;
  source: "nova-settlement-meta";
}

function isAllowedNovaApi(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !ALLOWED_NOVA_API_HOSTS.has(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function getJson(url: string): Promise<unknown | null> {
  const parsed = isAllowedNovaApi(url);
  if (!parsed) return null;
  try {
    const res = await fetch(parsed.toString());
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function hubConnected(payload: unknown, slug: SettlementMetaRail["slug"]): boolean | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const chains = (payload as { chains?: Record<string, { connected?: boolean; liquidityConnected?: boolean }> }).chains;
  const key = slug === "nova-one" ? "novaOne" : "nrwWorld";
  const section = chains?.[key] ?? chains?.[slug];
  if (!section) return undefined;
  return Boolean(section.connected || section.liquidityConnected);
}

export async function fetchMetaLiquidityStatus(chainId: number): Promise<MetaLiquidityStatus | null> {
  const rail = getSettlementRail(chainId);
  if (!rail) return null;
  const hub = await getJson(rail.liquidityHubPath);
  return {
    chainId: rail.chainId,
    name: rail.name,
    connected: hubConnected(hub, rail.slug) ?? false,
    liquidity: "nova-settlement-meta",
    settlement: "meta",
    swapRouter: rail.swapRouter,
    wrappedBridge: rail.wrappedBridge,
    hubConnected: hubConnected(hub, rail.slug),
  };
}

export async function fetchMetaQuote(params: {
  chainId: number;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
}): Promise<MetaQuote | null> {
  const rail = getSettlementRail(params.chainId);
  if (!rail) return null;
  const parsed = isAllowedNovaApi(rail.marketQuotePath);
  if (!parsed) return null;
  try {
    const res = await fetch(parsed.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    const amountOut =
      (typeof body.amountOut === "string" && body.amountOut) ||
      (typeof body.out === "string" && body.out) ||
      (typeof body.quantityOut === "string" && body.quantityOut) ||
      (typeof body.notional === "string" && body.notional) ||
      undefined;
    const price =
      (typeof body.price === "string" && body.price) ||
      (typeof body.mid === "string" && body.mid) ||
      (typeof body.midPrice === "number" && String(body.midPrice)) ||
      undefined;
    return {
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      amountOut,
      price,
      source: "nova-settlement-meta",
    };
  } catch {
    return null;
  }
}

export function getMetaSwapSymbols(chainId: number): string[] {
  if (!isSettlementMetaChain(chainId)) return [];
  const chain = getChain(chainId);
  if (!chain) return [];
  return chain.tokens.map((t) => t.symbol);
}
