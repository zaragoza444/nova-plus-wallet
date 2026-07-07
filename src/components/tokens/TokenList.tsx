import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useVisibleTokenRows } from "../../hooks/useVisibleTokenRows";
import { formatUsdEstimate } from "../../lib/prices";
import { paths, assetDetail } from "../../lib/routes";
import { hideToken, balanceRowKey } from "../../lib/prefs";
import { TokenListSkeleton } from "../common/Skeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { INSIGHTS } from "../../lib/insights";
import { AIInsight } from "../common/AIInsight";
import type { TokenBalanceRow } from "../../types";

const TOKEN_COLORS: Record<string, string> = {
  ALL: "#E8D48B",
  USDC: "#2775CA",
  USDT: "#26A17B",
  WETH: "#627EEA",
  WBTC: "#F7931A",
};

function tokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol] ?? "#8A7642";
}

function TokenRow({ row }: { row: TokenBalanceRow }): JSX.Element {
  const color = tokenColor(row.token.symbol);
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-2 px-4 py-3.5 transition-colors hover:bg-signet-surface">
      <Link
        to={assetDetail(row.chainId, row.token.symbol)}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ backgroundColor: `${color}22`, color }}
        >
          {row.token.symbol.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-signet-text">{row.token.symbol}</p>
          <p className="text-[11px] text-signet-muted">{row.chainName}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums text-signet-text">{row.formatted}</p>
          <p className="text-[11px] tabular-nums text-signet-muted">{formatUsdEstimate(row.usdEstimate)}</p>
        </div>
        <button
          type="button"
          className="tap-target rounded-lg border border-signet-border px-2 py-1 text-[10px] text-signet-muted hover:text-signet-text"
          onClick={() => hideToken(row)}
          aria-label={`Hide ${row.token.symbol}`}
        >
          Hide
        </button>
      </div>
    </div>
  );
}

export function TokenList({ address }: { address: string }): JSX.Element {
  const { tokenRows, loading, error, refresh, chainStatus } = useVisibleTokenRows(address, 15_000);

  const rows = useMemo(
    () =>
      [...tokenRows]
        .filter((r) => BigInt(r.balance) > 0n)
        .sort((a, b) => (b.usdEstimate ?? -1) - (a.usdEstimate ?? -1)),
    [tokenRows],
  );

  const okChains = chainStatus.filter((c) => c.status === "ok").length;

  if (loading && !rows.length) {
    return <TokenListSkeleton rows={6} />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState description={error} onRetry={refresh} />
        <AIInsight {...INSIGHTS.tokensEmpty} />
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No token balances"
          description="Fund this wallet on an enabled network, or add a custom token by contract address."
          action={{ label: "Receive funds", to: paths.receive }}
        />
        <AIInsight {...INSIGHTS.tokensEmpty} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {okChains > 0 && (
        <AIInsight
          title="Live balances"
          body={`Reading ${okChains} network${okChains === 1 ? "" : "s"}. Public chains include curated list tokens (USDC, WETH, etc.).`}
        />
      )}
      <div className="glass-card divide-y divide-signet-border overflow-hidden">
        {rows.map((row) => (
          <TokenRow key={balanceRowKey(row)} row={row} />
        ))}
      </div>
    </div>
  );
}
