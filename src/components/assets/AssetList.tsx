import { Link } from "react-router-dom";
import { useWalletContext } from "../../context/WalletContext";
import { useVisibleTokenRows } from "../../hooks/useVisibleTokenRows";
import { assetDetail } from "../../lib/routes";
import { TokenListSkeleton } from "../common/Skeleton";
import { EmptyState } from "../common/EmptyState";
import { ErrorState } from "../common/ErrorState";
import { AIInsight } from "../common/AIInsight";
import { INSIGHTS } from "../../lib/insights";

/** Tokenised asset symbols expected on the asset layer (when registered + funded). */
const ASSET_SYMBOLS = new Set(["ATKSH", "PROP", "AGAS", "AnA"]);

export function AssetList(): JSX.Element {
  const { address } = useWalletContext();
  const { tokenRows, loading, error, refresh } = useVisibleTokenRows(address, 15_000);

  const assetRows = tokenRows.filter(
    (r) => ASSET_SYMBOLS.has(r.token.symbol) && BigInt(r.balance) > 0n,
  );

  if (!address) return <EmptyState title="Wallet locked" description="Unlock Signet to view tokenised assets." />;

  if (loading && !tokenRows.length) {
    return <TokenListSkeleton rows={4} />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorState description={error} onRetry={refresh} />
      </div>
    );
  }

  if (!assetRows.length) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon="🏛"
          title="No tokenised holdings"
          description="ATKSH and PROP positions appear here once they are registered on-chain and this wallet holds a balance."
        />
        <AIInsight {...INSIGHTS.assetsEmpty} />
      </div>
    );
  }

  return (
    <div className="glass-card divide-y divide-signet-border overflow-hidden">
      {assetRows.map((row) => (
        <Link
          key={`${row.chainId}-${row.token.symbol}`}
          to={assetDetail(row.chainId, row.token.symbol)}
          className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-signet-surface"
        >
          <div>
            <p className="text-sm font-semibold text-signet-text">{row.token.symbol}</p>
            <p className="text-[11px] text-signet-muted">{row.chainName}</p>
          </div>
          <p className="text-sm font-semibold tabular-nums text-signet-text">{row.formatted}</p>
        </Link>
      ))}
    </div>
  );
}
