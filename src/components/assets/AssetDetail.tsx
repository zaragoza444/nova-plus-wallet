import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ConnectWallet } from "../wallet/ConnectWallet";
import { PageShell } from "../common/PageShell";
import { EmptyState } from "../common/EmptyState";
import { Skeleton } from "../common/Skeleton";
import { useWalletContext } from "../../context/WalletContext";
import { useTokenBalances } from "../../hooks/useTokenBalances";
import { getActivityForToken, type ActivityRecord } from "../../lib/activity";
import {
  formatChange24h,
  formatUsdEstimate,
  resolveTokenQuote,
  type TokenQuote,
} from "../../lib/prices";
import {
  paths,
  receiveOnChain,
  sendWithToken,
  swapWithToken,
  tokenChart,
} from "../../lib/routes";
import { resolveToken } from "../../lib/tokens";

function ActionPill({ to, icon, label }: { to: string; icon: string; label: string }): JSX.Element {
  return (
    <Link
      to={to}
      className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-signet-surface px-4 py-3.5 text-center transition-all hover:bg-signet-surface-raised hover:shadow-gold-sm active:scale-95"
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[11px] font-medium text-signet-muted">{label}</span>
    </Link>
  );
}

function ActivityRow({ row }: { row: ActivityRecord }): JSX.Element {
  const when = new Date(row.timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-signet-text">
          Sent {row.amount} {row.symbol}
        </p>
        <p className="text-[11px] text-signet-muted">
          To {row.to.slice(0, 6)}…{row.to.slice(-4)} · {when}
        </p>
      </div>
      {row.explorerUrl ? (
        <a
          href={row.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[11px] font-medium text-signet-gold underline"
        >
          View
        </a>
      ) : (
        <span className="shrink-0 font-mono text-[10px] text-signet-muted">
          {row.hash.slice(0, 8)}…
        </span>
      )}
    </div>
  );
}

export function AssetDetail(): JSX.Element {
  const { chainId: chainIdParam, symbol: symbolParam } = useParams();
  const chainId = Number(chainIdParam);
  const symbol = symbolParam ?? "";
  const { address } = useWalletContext();
  const { tokenRows, loading: balLoading } = useTokenBalances(address, 15_000);

  const meta = useMemo(
    () => (Number.isFinite(chainId) && symbol ? resolveToken(chainId, symbol) : null),
    [chainId, symbol],
  );

  const balanceRow = useMemo(
    () =>
      tokenRows.find(
        (r) =>
          r.chainId === chainId &&
          r.token.symbol.toUpperCase() === symbol.toUpperCase(),
      ) ?? null,
    [tokenRows, chainId, symbol],
  );

  const [quote, setQuote] = useState<TokenQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    if (!meta) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    let mounted = true;
    setQuoteLoading(true);
    void resolveTokenQuote({
      symbol: meta.symbol,
      units: 1,
      usd: meta.usd,
      coingeckoId: meta.coingeckoId,
    }).then((q) => {
      if (mounted) {
        setQuote(q);
        setQuoteLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [meta]);

  const activity = useMemo(
    () => (meta ? getActivityForToken(meta.chainId, meta.symbol) : []),
    [meta],
  );

  const holdingUsd = useMemo(() => {
    if (!balanceRow || quote?.priceUsd == null) return balanceRow?.usdEstimate ?? null;
    if (balanceRow.usdEstimate != null) return balanceRow.usdEstimate;
    return null;
  }, [balanceRow, quote]);

  if (!address) return <ConnectWallet />;

  if (!meta) {
    return (
      <PageShell width="lg">
        <EmptyState
          title="Token not found"
          description="This asset is not in the Signet registry for the requested chain and symbol."
          action={{ label: "Back to assets", to: paths.assets }}
        />
      </PageShell>
    );
  }

  const changePositive = quote?.change24hPct != null && quote.change24hPct >= 0;

  return (
    <PageShell width="lg">
      <div className="reveal">
        <Link to={paths.assets} className="text-[11px] font-medium text-signet-muted hover:text-signet-gold">
          ← Assets
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold"
            style={{ backgroundColor: `${meta.iconColor}20`, color: meta.iconColor }}
          >
            {meta.symbol.charAt(0)}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold text-signet-text">{meta.symbol}</h1>
            <p className="text-sm text-signet-muted">
              {meta.name} · {meta.chainName}
            </p>
          </div>
        </div>
      </div>

      <section className="glass-card-glow p-5 space-y-3 reveal reveal-1">
        <p className="text-[11px] font-medium uppercase tracking-widest text-signet-muted">Your balance</p>
        {balLoading && !balanceRow ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <p className="font-heading text-3xl font-bold tabular-nums text-signet-text">
              {balanceRow?.formatted ?? `0 ${meta.symbol}`}
            </p>
            <p className="text-sm tabular-nums text-signet-muted">
              ≈ {formatUsdEstimate(holdingUsd)}
            </p>
          </>
        )}

        <div className="flex items-baseline justify-between border-t border-signet-border pt-3">
          <div>
            <p className="text-[11px] text-signet-muted">Price</p>
            {quoteLoading ? (
              <p className="text-sm text-signet-muted">Loading…</p>
            ) : (
              <p className="text-lg font-semibold tabular-nums text-signet-text">
                {quote?.priceUsd != null
                  ? quote.priceUsd.toLocaleString(undefined, { style: "currency", currency: "USD" })
                  : "—"}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[11px] text-signet-muted">24h change</p>
            {quoteLoading ? (
              <p className="text-sm text-signet-muted">—</p>
            ) : (
              <p
                className={`text-lg font-semibold tabular-nums ${
                  quote?.change24hPct == null
                    ? "text-signet-muted"
                    : changePositive
                      ? "text-signet-verdant"
                      : "text-signet-danger"
                }`}
              >
                {formatChange24h(quote?.change24hPct ?? null)}
              </p>
            )}
          </div>
        </div>

        {meta.coingeckoId && (
          <Link
            to={`${tokenChart(meta.coingeckoId)}?symbol=${encodeURIComponent(meta.symbol)}`}
            className="inline-flex text-[11px] font-medium text-signet-gold hover:underline"
          >
            View price chart →
          </Link>
        )}
      </section>

      <section className="flex gap-2 reveal reveal-2">
        <ActionPill to={sendWithToken(meta.chainId, meta.symbol)} icon="↑" label="Send" />
        <ActionPill to={receiveOnChain(meta.chainId)} icon="↓" label="Receive" />
        <ActionPill
          to={swapWithToken(meta.chainId, meta.symbol, meta.address)}
          icon="⇄"
          label="Swap"
        />
      </section>

      <section className="reveal reveal-3">
        <h2 className="mb-2 text-sm font-semibold text-signet-text">Recent activity</h2>
        <div className="glass-card divide-y divide-signet-border overflow-hidden">
          {activity.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-signet-muted">
              No sends recorded for this token yet.
            </p>
          ) : (
            activity.slice(0, 10).map((row) => <ActivityRow key={row.id} row={row} />)
          )}
        </div>
      </section>
    </PageShell>
  );
}
