import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useWalletContext } from "../context/WalletContext";
import { ConnectWallet } from "../components/wallet/ConnectWallet";
import { useVisibleTokenRows } from "../hooks/useVisibleTokenRows";
import { useDisplaySettings } from "../hooks/useDisplaySettings";
import { useFAFO } from "../hooks/useFAFO";
import { FAFOStatus } from "../components/fafo/FAFOStatus";
import { PortfolioAnchor } from "../components/dashboard/PortfolioAnchor";
import { TokenListSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { AIInsight } from "../components/common/AIInsight";
import { paths, assetDetail } from "../lib/routes";
import { formatUsdEstimate } from "../lib/prices";
import { INSIGHTS } from "../lib/insights";
import type { TokenBalanceRow } from "../types";

const TOKEN_COLORS: Record<string, string> = {
  AGAS: "#C9A84C",
  ALL: "#E8D48B",
  wBTC: "#F7931A",
  wETH: "#627EEA",
  wUSD: "#3D8B6E",
};

function tokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol] ?? "#8A7642";
}

function QuickAction({ to, icon, label }: { to: string; icon: string; label: string }): JSX.Element {
  return (
    <Link
      to={to}
      className="tap-target group flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border border-signet-border bg-signet-surface/80 px-3 py-4 text-center backdrop-blur-sm transition-all duration-200 hover:border-signet-gold/40 hover:bg-signet-surface-raised hover:shadow-gold-sm active:scale-[0.98]"
    >
      <span className="text-xl leading-none text-signet-gold transition group-hover:scale-110">{icon}</span>
      <span className="text-[11px] font-medium text-signet-muted group-hover:text-signet-text">{label}</span>
    </Link>
  );
}

function TokenRow({ row }: { row: TokenBalanceRow }): JSX.Element {
  const color = tokenColor(row.token.symbol);
  return (
    <Link
      to={assetDetail(row.chainId, row.token.symbol)}
      className="flex min-h-[44px] items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-signet-surface"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {row.token.symbol.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-signet-text">{row.token.symbol}</p>
          <p className="text-[11px] text-signet-muted">{row.chainName}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-signet-text">
          {formatUsdEstimate(row.usdEstimate)}
        </p>
        <p className="text-[11px] tabular-nums text-signet-muted">{row.formatted}</p>
      </div>
    </Link>
  );
}

function ChainDot({ name, status }: { name: string; status: "ok" | "unavailable" }): JSX.Element {
  const dotClass = status === "ok" ? "bg-signet-verdant" : "bg-signet-warning";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      <span className="text-[10px] text-signet-muted">
        {name}
        {status === "unavailable" && <span className="ml-1 text-signet-warning">· unavailable</span>}
      </span>
    </div>
  );
}

export function Dashboard(): JSX.Element {
  const { address } = useWalletContext();
  const { displayCurrency } = useDisplaySettings();
  const { tokenRows, totalUsd, loading, chainStatus, error, refresh } = useVisibleTokenRows(
    address ?? undefined,
    15_000,
  );
  const fafo = useFAFO(address ?? undefined, 45_000);

  const sortedTokens = useMemo(
    () => [...tokenRows].sort((a, b) => (b.usdEstimate ?? -1) - (a.usdEstimate ?? -1)),
    [tokenRows],
  );

  const okChains = chainStatus.filter((c) => c.status === "ok").length;

  if (!address) {
    return <ConnectWallet />;
  }

  return (
    <div className="page-shell">
      {fafo.anyEnforced && (
        <div className="rounded-2xl border border-signet-danger/30 bg-signet-danger-soft px-4 py-3 text-sm reveal">
          <p className="font-heading font-semibold text-signet-danger">FAFO enforcement active</p>
          <p className="mt-1 text-signet-muted">Review your status before moving funds.</p>
          <Link
            className="tap-target mt-2 inline-flex items-center text-sm font-medium text-signet-gold underline"
            to={`${paths.settings}/fafo`}
          >
            View FAFO details →
          </Link>
        </div>
      )}

      <PortfolioAnchor
        totalUsd={totalUsd}
        displayCurrency={displayCurrency}
        loading={loading && !tokenRows.length}
      />

      <section className="reveal reveal-2">
        <div className="flex justify-between gap-2">
          <QuickAction to={paths.send} icon="↑" label="Send" />
          <QuickAction to={paths.receive} icon="↓" label="Receive" />
          <QuickAction to={paths.swap} icon="⇄" label="Swap" />
          <QuickAction to={paths.bridge} icon="⛓" label="Bridge" />
        </div>
      </section>

      <AIInsight {...INSIGHTS.dashboard(okChains)} className="reveal reveal-2" />

      <section className="flex flex-wrap items-center gap-3 px-1 reveal reveal-2">
        {loading && !chainStatus.length ? (
          <span className="text-[10px] text-signet-muted">Checking chains…</span>
        ) : (
          chainStatus.map((c) => <ChainDot key={c.chainId} name={c.chainName} status={c.status} />)
        )}
      </section>

      <section className="reveal reveal-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-sm font-semibold text-signet-text">Assets</h2>
          <Link
            to={paths.tokens}
            className="tap-target inline-flex items-center text-[11px] font-medium text-signet-muted transition-colors hover:text-signet-gold"
          >
            See all →
          </Link>
        </div>

        {error ? (
          <ErrorState description={error} onRetry={refresh} />
        ) : loading && !tokenRows.length ? (
          <TokenListSkeleton rows={5} />
        ) : !sortedTokens.length ? (
          <EmptyState
            title="No assets yet"
            description="Receive funds on an enabled network to populate your portfolio."
            action={{ label: "Receive", to: paths.receive }}
          />
        ) : (
          <div className="glass-card divide-y divide-signet-border overflow-hidden">
            {sortedTokens.slice(0, 8).map((row) => (
              <TokenRow key={`${row.chainId}-${row.token.symbol}`} row={row} />
            ))}
          </div>
        )}
      </section>

      <section className="glass-card p-4 reveal reveal-4">
        <h2 className="font-heading text-sm font-semibold text-signet-text">FAFO Status</h2>
        <div className="mt-3">
          <FAFOStatus statuses={fafo.statuses} loading={fafo.loading} error={fafo.error} />
        </div>
      </section>
    </div>
  );
}
