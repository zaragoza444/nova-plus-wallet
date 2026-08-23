import { useCallback, useEffect, useMemo, useState } from "react";
import { getChain } from "../../lib/chains";
import { getSettlementRail, isSettlementMetaChain } from "../../lib/settlement-meta";
import {
  fetchMetaLiquidityStatus,
  fetchMetaQuote,
  type MetaLiquidityStatus,
} from "../../lib/swap/metaSettlement";

export function MetaSettlementSwap({ chainId }: { chainId: number }): JSX.Element | null {
  const rail = getSettlementRail(chainId);
  const chain = getChain(chainId);
  const symbols = useMemo(
    () => (chain ? chain.tokens.map((t) => t.symbol) : []),
    [chain],
  );

  const [fromSym, setFromSym] = useState(symbols[0] ?? "");
  const [toSym, setToSym] = useState(symbols[1] ?? symbols[0] ?? "");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<MetaLiquidityStatus | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  useEffect(() => {
    if (!isSettlementMetaChain(chainId)) return;
    void fetchMetaLiquidityStatus(chainId).then(setStatus);
  }, [chainId]);

  useEffect(() => {
    if (!symbols.length) return;
    if (!symbols.includes(fromSym)) setFromSym(symbols[0] ?? "");
    if (!symbols.includes(toSym)) setToSym(symbols[1] ?? symbols[0] ?? "");
  }, [symbols, fromSym, toSym]);

  const refreshQuote = useCallback(async () => {
    if (!amount.trim() || !fromSym) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    const q = await fetchMetaQuote({
      chainId,
      fromSymbol: fromSym,
      toSymbol: toSym,
      quantity: amount.trim(),
    });
    setQuote(q?.amountOut ?? (q?.price ? `${q.price} (mid)` : null));
    setQuoteLoading(false);
  }, [amount, chainId, fromSym, toSym]);

  useEffect(() => {
    const t = setTimeout(() => void refreshQuote(), 400);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  if (!rail || !chain) return null;

  return (
    <div className="glass-card space-y-4 p-5">
      <div>
        <p className="text-sm font-semibold text-signet-text">Nova settlement meta</p>
        <p className="mt-1 text-xs text-signet-muted">
          {chain.name} ({chainId}) liquidity is m2 Meta Fiat via the Nova liquidity hub — not 1inch.
          Tokenized assets settle through this rail on both NovaONE and NRW World.
        </p>
      </div>
      <div className="rounded-xl border border-signet-border bg-signet-bg/50 px-4 py-3 text-[11px] text-signet-muted space-y-1">
        <p>
          Production:{" "}
          {status?.production || status?.liveActive
            ? "live"
            : status
              ? "unreachable from this origin"
              : "checking…"}
        </p>
        <p>
          Hub: {status?.hubConnected || status?.connected ? "connected" : status ? "unreachable" : "checking…"}
          {status?.marionetteConnected ? " · Marionette live" : ""}
        </p>
        {status?.blockNumber ? <p>Block {status.blockNumber}</p> : null}
        <p className="font-mono">Router {rail.swapRouter}</p>
        <p className="font-mono">Wrap {rail.wrappedBridge}</p>
      </div>
      <label className="block">
        <span className="text-[11px] font-medium text-signet-muted">From</span>
        <select
          className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 text-sm"
          value={fromSym}
          onChange={(e) => setFromSym(e.target.value)}
        >
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-[11px] font-medium text-signet-muted">To</span>
        <select
          className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 text-sm"
          value={toSym}
          onChange={(e) => setToSym(e.target.value)}
        >
          {symbols.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-[11px] font-medium text-signet-muted">Amount</span>
        <input
          type="text"
          inputMode="decimal"
          className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 font-mono text-sm"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <div className="flex items-center justify-between text-sm">
        <span className="text-signet-muted">Indicative out</span>
        <span className="font-mono font-semibold text-signet-text">
          {quoteLoading ? "…" : quote ?? "—"} {toSym}
        </span>
      </div>
      <p className="text-[11px] text-signet-muted">
        Quotes use the live NovaONE book when the production API is reachable, otherwise the
        settlement-meta mid (CoinGecko + Nova pegs). Ledger execute stays on the Nova Bank API.
      </p>
    </div>
  );
}
