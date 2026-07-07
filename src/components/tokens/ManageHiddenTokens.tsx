import { useMemo } from "react";
import { useTokenBalances } from "../../hooks/useTokenBalances";
import { usePrefs } from "../../hooks/useDisplaySettings";
import { useWalletContext } from "../../context/WalletContext";
import { balanceRowKey, getHiddenTokenSet, unhideToken } from "../../lib/prefs";

function formatHiddenKey(key: string): string {
  const [chainId, rest] = key.split(":");
  if (rest?.startsWith("native:")) {
    return `${rest.slice(7)} · chain ${chainId}`;
  }
  if (rest && rest.length > 12) {
    return `${rest.slice(0, 6)}…${rest.slice(-4)} · chain ${chainId}`;
  }
  return key;
}

export function ManageHiddenTokens(): JSX.Element {
  const { address } = useWalletContext();
  const prefs = usePrefs();
  const hiddenSet = useMemo(() => getHiddenTokenSet(prefs), [prefs]);
  const { tokenRows } = useTokenBalances(address, 30_000);

  const hiddenRows = useMemo(
    () => tokenRows.filter((r) => hiddenSet.has(balanceRowKey(r))),
    [tokenRows, hiddenSet],
  );

  const manualHidden = useMemo(
    () => prefs.hiddenTokens.filter((key) => !tokenRows.some((r) => balanceRowKey(r) === key)),
    [prefs.hiddenTokens, tokenRows],
  );

  if (!prefs.hiddenTokens.length) {
    return (
      <p className="text-sm text-signet-muted">
        No hidden tokens. Use Hide on a token row to suppress it from your portfolio.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hiddenRows.map((row) => {
        const key = balanceRowKey(row);
        return (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-xl border border-signet-border px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-signet-text">
                {row.token.symbol} · {row.chainName}
              </p>
              <p className="text-[11px] text-signet-muted">{row.formatted}</p>
            </div>
            <button type="button" className="btn-secondary tap-target text-xs" onClick={() => unhideToken(key)}>
              Unhide
            </button>
          </div>
        );
      })}
      {manualHidden.map((key) => (
        <div
          key={key}
          className="flex items-center justify-between gap-3 rounded-xl border border-signet-border px-3 py-2.5"
        >
          <p className="font-mono text-xs text-signet-muted">{formatHiddenKey(key)}</p>
          <button type="button" className="btn-secondary tap-target text-xs" onClick={() => unhideToken(key)}>
            Unhide
          </button>
        </div>
      ))}
    </div>
  );
}
