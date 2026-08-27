import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ConnectWallet } from "../wallet/ConnectWallet";
import { BridgeReviewModal } from "./BridgeReviewModal";
import { useToast } from "../../context/ToastContext";
import { useBridge } from "../../hooks/useBridge";
import { portalLabel } from "../../lib/bridge/history";
import { paths } from "../../lib/routes";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function BridgePanel(): JSX.Element {
  const { pushToast } = useToast();
  const {
    address,
    portalChains,
    fromChainId,
    setFromChainId,
    toChainId,
    setToChainId,
    swapDirection,
    route,
    availableTokens,
    token,
    setToken,
    amount,
    setAmount,
    recipient,
    setRecipient,
    balanceFormatted,
    phase,
    preview,
    setPreview,
    prepareReview,
    confirmBridge,
  } = useBridge();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const busy = phase === "executing";

  const openReview = useCallback(async () => {
    setFormError(null);
    const result = await prepareReview();
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setReviewOpen(true);
  }, [prepareReview]);

  const handleConfirm = useCallback(async () => {
    const result = await confirmBridge();
    setReviewOpen(false);
    if (result.ok) {
      pushToast({
        title: "Bridge submitted",
        body: `${result.record.pathLabel} — ${shortAddr(result.record.sourceTxHash)}`,
        tone: "success",
      });
    } else {
      pushToast({ title: "Bridge failed", body: result.message, tone: "error" });
    }
  }, [confirmBridge, pushToast]);

  const setMax = () => setAmount(balanceFormatted);

  return (
    <>
      <div className="glass-card space-y-5 p-5">
        {!address && (
          <div className="rounded-xl border border-signet-border bg-signet-surface/60 px-4 py-3 text-center text-sm text-signet-muted">
            <ConnectWallet />
            <p className="mt-2">Unlock your wallet to bridge across the mesh.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr,auto,1fr] sm:items-end">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">From</span>
            <select
              className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm text-signet-text"
              value={fromChainId}
              onChange={(e) => {
                setFromChainId(Number(e.target.value));
                setAmount("");
              }}
            >
              {portalChains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fromChainId && (
              <span className="block font-mono text-[10px] text-signet-muted">
                Portal {portalLabel(fromChainId)}
              </span>
            )}
          </label>

          <button
            type="button"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-signet-border text-signet-gold transition hover:border-signet-gold/40"
            onClick={swapDirection}
            aria-label="Swap direction"
          >
            ⇄
          </button>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">To</span>
            <select
              className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm text-signet-text"
              value={toChainId}
              onChange={(e) => {
                setToChainId(Number(e.target.value));
                setAmount("");
              }}
            >
              {portalChains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {toChainId && portalLabel(toChainId) !== "—" && (
              <span className="block font-mono text-[10px] text-signet-muted">
                Portal {portalLabel(toChainId)}
              </span>
            )}
          </label>
        </div>

        {route.ok ? (
          <div className="rounded-xl border border-signet-verdant/30 bg-signet-verdant/10 px-3 py-2.5 text-xs text-signet-text">
            <p className="font-medium text-signet-verdant">{route.label}</p>
            <p className="mt-1 text-signet-muted">{route.description}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-signet-danger/30 bg-signet-danger-soft px-3 py-2.5 text-xs text-signet-muted">
            <p className="font-medium text-signet-danger">Route unavailable</p>
            <p className="mt-1">{route.reason}</p>
          </div>
        )}

        {availableTokens.length > 0 && (
          <>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">Token</span>
              <select
                className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm"
                value={token ? `${token.symbol}:${token.address}` : ""}
                onChange={(e) => {
                  const t = availableTokens.find((x) => `${x.symbol}:${x.address}` === e.target.value);
                  if (t) setToken(t);
                }}
              >
                {availableTokens.map((t) => (
                  <option key={`${t.symbol}:${t.address}`} value={`${t.symbol}:${t.address}`}>
                    {t.symbol} — {t.lockable ? "lockable" : "catalog"}
                  </option>
                ))}
              </select>
              {token && (
                <span className="block text-[11px] text-signet-muted">{token.detail}</span>
              )}
            </label>

            <label className="block space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">Amount</span>
                <button
                  type="button"
                  className="text-[11px] text-signet-gold hover:underline"
                  onClick={setMax}
                  disabled={!address || phase === "loading_balance"}
                >
                  Max: {phase === "loading_balance" ? "…" : balanceFormatted} {token?.symbol}
                </button>
              </div>
              <input
                type="text"
                inputMode="decimal"
                className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!address}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">
                Recipient on destination
              </span>
              <input
                type="text"
                className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 font-mono text-sm"
                placeholder="0x…"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={!address}
              />
            </label>
          </>
        )}

        {formError && (
          <p className="text-sm text-signet-danger">{formError}</p>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          disabled={
            !address
            || !route.ok
            || busy
            || phase === "loading_balance"
            || (route.ok && route.pathKind === "nova_lock_release" && !token?.lockable)
          }
          onClick={() => void openReview()}
        >
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing…
            </span>
          ) : (
            "Review bridge"
          )}
        </button>

        <p className="text-center text-[11px] text-signet-muted">
          Need a DEX instead?{" "}
          <Link to={paths.swap} className="text-signet-gold underline">
            Swap
          </Link>
        </p>
      </div>

      <BridgeReviewModal
        open={reviewOpen}
        onClose={() => {
          setReviewOpen(false);
          setPreview(null);
        }}
        preview={preview}
        busy={busy}
        onConfirm={() => void handleConfirm()}
      />
    </>
  );
}
