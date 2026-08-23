/** Live Nova settlement-meta quotes and production hub status. */

import { getChain, type TokenDef } from "../chains";
import { novaGetJson, novaPostJson, resolveNovaApiBase } from "../nova-api";
import {
  asNumberString,
  asRecord,
  asString,
  resolveNovaOnePair,
  SETTLEMENT_USD_REF,
} from "../nova-one-markets";
import { fetchCoinGeckoPrices, resolveUsd } from "../prices";
import { getSettlementRail, isSettlementMetaChain } from "../settlement-meta";

export interface MetaLiquidityStatus {
  chainId: number;
  name: string;
  connected: boolean;
  production: boolean;
  liveActive: boolean;
  rpcConnected: boolean;
  liquidityConnected: boolean;
  marionetteConnected: boolean;
  blockNumber?: string;
  liquidity: "nova-settlement-meta";
  settlement: "meta";
  swapRouter: string;
  wrappedBridge: string;
  hubConnected?: boolean;
  apiBase?: string;
}

export interface MetaQuote {
  symbol: string;
  side: "BUY" | "SELL";
  quantity: string;
  amountOut?: string;
  price?: string;
  source: "nova-settlement-meta";
  venue: "live-book" | "settlement-mid";
  pair?: string;
}

function flag(obj: Record<string, unknown> | null, key: string): boolean {
  return Boolean(obj?.[key]);
}

export async function fetchMetaLiquidityStatus(chainId: number): Promise<MetaLiquidityStatus | null> {
  const rail = getSettlementRail(chainId);
  if (!rail) return null;
  const base = await resolveNovaApiBase();
  const empty: MetaLiquidityStatus = {
    chainId: rail.chainId,
    name: rail.name,
    connected: false,
    production: false,
    liveActive: false,
    rpcConnected: false,
    liquidityConnected: false,
    marionetteConnected: false,
    liquidity: "nova-settlement-meta",
    settlement: "meta",
    swapRouter: rail.swapRouter,
    wrappedBridge: rail.wrappedBridge,
    apiBase: base ?? undefined,
  };
  if (!base) return empty;

  const [chainStatus, swapStatus, routers, nrwHub] = await Promise.all([
    novaGetJson(`${base}${rail.chainStatusPath}`),
    novaGetJson(`${base}${rail.swapStatusPath}`),
    novaGetJson(`${base}${rail.routersStatusPath}`),
    rail.slug === "nrw-world" ? novaGetJson(`${base}${rail.nrwHubPath}`) : Promise.resolve(null),
  ]);

  const chain = asRecord(chainStatus);
  const swap = asRecord(swapStatus);
  const hub = asRecord(nrwHub);
  const routerPayload = asRecord(routers);
  const dex = asRecord(routerPayload?.["marionette-dex"] ?? routerPayload?.marionetteDex);
  const marionette = flag(swap, "marionetteConnected") || flag(dex, "connected");
  const connected =
    flag(chain, "connected") ||
    flag(chain, "rpcConnected") ||
    flag(chain, "liveActive") ||
    flag(hub, "connected") ||
    marionette;

  return {
    ...empty,
    connected,
    production: flag(chain, "production") || connected,
    liveActive: flag(chain, "liveActive") || flag(chain, "connected"),
    rpcConnected: flag(chain, "rpcConnected") || flag(chain, "connected"),
    liquidityConnected: flag(chain, "liquidityConnected") || marionette || flag(hub, "connected"),
    marionetteConnected: marionette,
    blockNumber: asString(chain?.blockNumber) ?? asString(swap?.blockNumber),
    hubConnected: rail.slug === "nrw-world" ? flag(hub, "connected") || connected : marionette || connected,
  };
}

function tokenUsd(token: TokenDef | undefined, symbol: string, cg: Map<string, number>): number | null {
  if (token) {
    const live = resolveUsd(
      { symbol: token.symbol, units: 1, usd: token.usd, coingeckoId: token.coingeckoId },
      cg,
    );
    if (live != null) return live;
  }
  const ref = SETTLEMENT_USD_REF[symbol.toUpperCase()];
  return ref != null ? ref : null;
}

async function settlementMidQuote(params: {
  chainId: number;
  fromSymbol: string;
  toSymbol: string;
  quantity: string;
  pair?: string;
  fromIsBase: boolean;
}): Promise<MetaQuote | null> {
  const qty = Number(params.quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const chain = getChain(params.chainId);
  const fromTok = chain?.tokens.find((t) => t.symbol.toUpperCase() === params.fromSymbol.toUpperCase());
  const toTok = chain?.tokens.find((t) => t.symbol.toUpperCase() === params.toSymbol.toUpperCase());
  const ids = [fromTok?.coingeckoId, toTok?.coingeckoId].filter(Boolean) as string[];
  const cg = await fetchCoinGeckoPrices(ids);
  const fromUsd = tokenUsd(fromTok, params.fromSymbol, cg);
  const toUsd = tokenUsd(toTok, params.toSymbol, cg);
  if (fromUsd == null || toUsd == null || toUsd === 0) return null;
  const amountOut = ((qty * fromUsd) / toUsd) * (1 - 30 / 10_000);
  const price = params.fromIsBase ? toUsd / fromUsd : fromUsd / toUsd;
  return {
    symbol: params.fromSymbol,
    side: params.fromIsBase ? "SELL" : "BUY",
    quantity: params.quantity,
    amountOut: amountOut.toFixed(8),
    price: price.toFixed(8),
    source: "nova-settlement-meta",
    venue: "settlement-mid",
    pair: params.pair,
  };
}

export async function fetchMetaQuote(params: {
  chainId: number;
  fromSymbol: string;
  toSymbol: string;
  quantity: string;
}): Promise<MetaQuote | null> {
  const rail = getSettlementRail(params.chainId);
  if (!rail) return null;
  const pair = resolveNovaOnePair(params.fromSymbol, params.toSymbol);
  const base = await resolveNovaApiBase();

  if (base && pair) {
    const body = await novaPostJson(`${base}${rail.marketQuotePath}`, {
      symbol: pair.symbol,
      side: pair.fromIsBase ? "SELL" : "BUY",
      quantity: pair.fromIsBase ? params.quantity : "1",
    });
    const rec = asRecord(body);
    if (rec) {
      const price =
        asNumberString(rec.price) ?? asNumberString(rec.mid) ?? asNumberString(rec.midPrice);
      const quoteQty =
        asNumberString(rec.cummulativeQuoteQty) ??
        asNumberString(rec.cumulativeQuoteQty) ??
        asNumberString(rec.amountOut) ??
        asNumberString(rec.out);
      const qty = Number(params.quantity);
      const px = price != null ? Number(price) : NaN;
      let amountOut = quoteQty;
      if (!pair.fromIsBase && Number.isFinite(px) && px > 0 && Number.isFinite(qty)) {
        amountOut = (qty / px).toFixed(8);
      }
      if (amountOut || price) {
        return {
          symbol: params.fromSymbol,
          side: pair.fromIsBase ? "SELL" : "BUY",
          quantity: params.quantity,
          amountOut,
          price,
          source: "nova-settlement-meta",
          venue: "live-book",
          pair: pair.symbol,
        };
      }
    }
  }

  return settlementMidQuote({
    chainId: params.chainId,
    fromSymbol: params.fromSymbol,
    toSymbol: params.toSymbol,
    quantity: params.quantity,
    pair: pair?.symbol,
    fromIsBase: pair?.fromIsBase ?? true,
  });
}

export function getMetaSwapSymbols(chainId: number): string[] {
  if (!isSettlementMetaChain(chainId)) return [];
  const chain = getChain(chainId);
  if (!chain) return [];
  return chain.tokens.map((t) => t.symbol);
}
