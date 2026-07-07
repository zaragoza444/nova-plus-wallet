import { useEffect, useState } from "react";
import {
  getBridgeRecords,
  pollBridgeRecordStatuses,
  statusLabel,
  statusTone,
  type BridgeRecord,
} from "../../lib/bridge/history";

const TONE_CLASS: Record<ReturnType<typeof statusTone>, string> = {
  success: "text-signet-verdant border-signet-verdant/30 bg-signet-verdant/10",
  error: "text-signet-danger border-signet-danger/30 bg-signet-danger-soft",
  pending: "text-signet-gold border-signet-gold/30 bg-signet-gold/10",
  neutral: "text-signet-muted border-signet-border bg-signet-surface/40",
};

function shortHash(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BridgeHistory(): JSX.Element {
  const [records, setRecords] = useState<BridgeRecord[]>(() => getBridgeRecords());

  useEffect(() => {
    const refresh = () => {
      void pollBridgeRecordStatuses().then(() => setRecords(getBridgeRecords()));
    };
    refresh();
    const id = window.setInterval(refresh, 20_000);
    const onChange = () => setRecords(getBridgeRecords());
    window.addEventListener("signet:bridge-changed", onChange);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("signet:bridge-changed", onChange);
    };
  }, []);

  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-sm font-semibold text-signet-text">Bridge history</h2>
        <span className="text-[11px] text-signet-muted">
          {records.length} record{records.length === 1 ? "" : "s"}
        </span>
      </div>

      {records.length === 0 ? (
        <p className="py-8 text-center text-sm text-signet-muted">
          No bridge transactions yet. Completed and in-flight transfers appear here with relayer or validator status.
        </p>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => {
            const tone = statusTone(r.status);
            return (
              <li
                key={r.id}
                className="rounded-xl border border-signet-border/80 bg-signet-surface/50 px-3 py-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-signet-text">
                      {r.amount} {r.tokenSymbol}
                    </p>
                    <p className="text-xs text-signet-muted">
                      {r.pathLabel} · {r.fromChainName} → {r.toChainName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TONE_CLASS[tone]}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-signet-muted">{r.statusDetail}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-signet-muted">
                  <span>{formatWhen(r.timestamp)}</span>
                  {r.bridgeNonce && <span>Nonce {r.bridgeNonce}</span>}
                  {r.sourceExplorerUrl ? (
                    <a
                      href={r.sourceExplorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-signet-gold underline"
                    >
                      {shortHash(r.sourceTxHash)}
                    </a>
                  ) : (
                    <span className="font-mono">{shortHash(r.sourceTxHash)}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
