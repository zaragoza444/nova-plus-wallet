import { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { formatUnits, parseUnits } from "ethers";
import { ConnectWallet } from "../components/wallet/ConnectWallet";
import { Modal } from "../components/common/Modal";
import { useWalletContext } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { useVisibleTokenRows } from "../hooks/useVisibleTokenRows";
import { useTokenTransfer } from "../hooks/useTokenTransfer";
import { paths } from "../lib/routes";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";
import { TokenListSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { AIInsight } from "../components/common/AIInsight";
import { INSIGHTS } from "../lib/insights";
import type { TokenBalanceRow } from "../types";
import { formatUsdEstimate } from "../lib/prices";
import type { TransferEstimate } from "../lib/transfer";

const TOKEN_COLORS: Record<string, string> = {
  AGAS: "#C9A84C", AnA: "#8B5CF6", ATKSH: "#5B8DEF", PROP: "#2DD4BF",
  wBTC: "#F7931A", wETH: "#627EEA", wUSD: "#3D8B6E", wEUR: "#3B82F6",
  wGBP: "#EF4444", wAUD: "#F59E0B", wJPY: "#EC4899", wCHF: "#10B981",
  wSGD: "#6366F1", wUSDC: "#2775CA", wUSDT: "#26A17B",
  emUSD: "#3D8B6E", emEUR: "#3B82F6", emGBP: "#EF4444", emAUD: "#F59E0B",
};

function tokenColor(symbol: string): string {
  return TOKEN_COLORS[symbol] ?? "#6B7280";
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function usdForAmount(row: TokenBalanceRow, amountText: string): number | null {
  if (row.usdEstimate == null) return null;
  const balance = BigInt(row.balance);
  if (balance === 0n) return null;
  const trimmed = amountText.trim();
  if (!trimmed) return null;
  try {
    const amountWei = parseUnits(trimmed, row.token.decimals);
    if (amountWei <= 0n) return null;
    return (Number(amountWei) / Number(balance)) * row.usdEstimate;
  } catch {
    return null;
  }
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">{label}</span>
      <span className={`text-right text-sm text-signet-text ${mono ? "font-mono break-all" : ""}`}>{value}</span>
    </div>
  );
}

export function SendPage(): JSX.Element {
  const { address } = useWalletContext();
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const { tokenRows, loading, error, refresh } = useVisibleTokenRows(address, 15_000);
  const { estimate, sendTransfer, phase } = useTokenTransfer();

  const [selected, setSelected] = useState<TokenBalanceRow | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"select" | "details" | "success">("select");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [review, setReview] = useState<TransferEstimate | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ hash: string; explorerUrl: string | null } | null>(null);

  const maxAmount = selected ? formatUnits(selected.balance, selected.token.decimals) : "0";
  const busy = phase === "estimating" || phase === "confirming" || phase === "pending";

  const reviewUsd = useMemo(() => {
    if (!selected || !amount.trim()) return null;
    return usdForAmount(selected, amount);
  }, [selected, amount]);

  const handleSelect = useCallback((row: TokenBalanceRow) => {
    setSelected(row);
    setRecipient("");
    setAmount("");
    setFormError(null);
    setStep("details");
  }, []);

  useEffect(() => {
    const cid = Number(searchParams.get("chainId"));
    const sym = searchParams.get("symbol");
    if (!Number.isFinite(cid) || !sym || loading) return;
    const row = tokenRows.find(
      (r) => r.chainId === cid && r.token.symbol.toUpperCase() === sym.toUpperCase(),
    );
    if (row) handleSelect(row);
  }, [searchParams, tokenRows, loading, handleSelect]);

  const buildParams = useCallback(() => {
    if (!selected) return null;
    return {
      chainId: selected.chainId,
      tokenAddress: selected.token.address,
      decimals: selected.token.decimals,
      symbol: selected.token.symbol,
      to: recipient,
      amountText: amount,
      balanceWei: selected.balance,
    };
  }, [selected, recipient, amount]);

  const openReview = useCallback(async () => {
    if (!address || !selected) return;
    setFormError(null);
    const params = buildParams();
    if (!params) return;

    const result = await estimate(params, address);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    setReview(result.estimate);
    setReviewOpen(true);
  }, [address, selected, buildParams, estimate]);

  const confirmSend = useCallback(async () => {
    if (!address || !selected || !review) return;
    const params = buildParams();
    if (!params) return;

    const result = await sendTransfer(params, address, {
      symbol: selected.token.symbol,
      amount: amount.trim(),
    });

    setReviewOpen(false);

    if (result.ok) {
      setSuccess({ hash: result.hash, explorerUrl: result.explorerUrl });
      setStep("success");
      pushToast({
        title: "Transaction sent",
        body: result.explorerUrl
          ? `${shortAddr(result.hash)} — ${result.explorerUrl}`
          : result.hash,
        tone: "success",
      });
    } else {
      pushToast({ title: "Send failed", body: result.message, tone: "error" });
    }
  }, [address, selected, review, buildParams, sendTransfer, amount, pushToast]);

  const reset = () => {
    setSelected(null);
    setRecipient("");
    setAmount("");
    setReview(null);
    setReviewOpen(false);
    setFormError(null);
    setSuccess(null);
    setStep("select");
  };

  if (!address) return <ConnectWallet />;

  return (
    <PageShell width="lg">
      <PageHeader
        eyebrow="Send"
        title="Send tokens"
        description="Select a token, enter details, and review before signing."
      />
      <AIInsight {...INSIGHTS.send} className="reveal reveal-1" />

      {step === "select" && (
        <div className="space-y-3 reveal reveal-1">
          {error ? (
            <ErrorState description={error} onRetry={refresh} />
          ) : loading && !tokenRows.length ? (
            <TokenListSkeleton rows={5} />
          ) : !tokenRows.filter((r) => BigInt(r.balance) > 0n).length ? (
            <EmptyState
              title="Nothing to send"
              description="No tokens with balance on enabled networks."
              action={{ label: "Receive funds", to: paths.receive }}
            />
          ) : (
            <div className="glass-card divide-y divide-signet-border overflow-hidden">
              {tokenRows
                .filter((r) => BigInt(r.balance) > 0n)
                .sort((a, b) => (b.usdEstimate ?? -1) - (a.usdEstimate ?? -1))
                .map((row) => {
                  const color = tokenColor(row.token.symbol);
                  return (
                    <button
                      key={`${row.chainId}-${row.token.symbol}`}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-signet-surface"
                      onClick={() => handleSelect(row)}
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
                        <p className="text-sm font-semibold tabular-nums text-signet-text">{row.formatted}</p>
                        <p className="text-[11px] tabular-nums text-signet-muted">
                          ≈ {formatUsdEstimate(row.usdEstimate)}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {step === "details" && selected && (
        <div className="glass-card p-5 space-y-4 reveal reveal-1">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
              style={{
                backgroundColor: `${tokenColor(selected.token.symbol)}20`,
                color: tokenColor(selected.token.symbol),
              }}
            >
              {selected.token.symbol.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-signet-text">{selected.token.symbol}</p>
              <p className="text-[11px] text-signet-muted">
                Balance: {selected.formatted} · {selected.chainName}
              </p>
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-medium text-signet-muted">Recipient address</span>
            <input
              type="text"
              className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 font-mono text-sm text-signet-text placeholder:text-signet-dim focus:border-signet-gold/50 focus:outline-none"
              placeholder="0x…"
              value={recipient}
              onChange={(e) => { setRecipient(e.target.value); setFormError(null); }}
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="block">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-signet-muted">Amount</span>
              <button
                type="button"
                className="text-[11px] font-medium text-signet-gold hover:text-signet-gold-light"
                onClick={() => setAmount(maxAmount)}
              >
                Max: {maxAmount}
              </button>
            </div>
            <input
              type="text"
              inputMode="decimal"
              className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 font-mono text-sm text-signet-text placeholder:text-signet-dim focus:border-signet-gold/50 focus:outline-none"
              placeholder="0.00"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setFormError(null); }}
            />
          </label>

          {formError && (
            <p className="rounded-xl border border-signet-danger/30 bg-signet-danger-soft px-3 py-2 text-sm text-signet-danger">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 min-h-[48px] rounded-xl border border-signet-border text-sm font-medium text-signet-muted hover:text-signet-text transition-colors"
              onClick={() => setStep("select")}
            >
              Back
            </button>
            <button
              type="button"
              className="flex-1 min-h-[48px] rounded-xl bg-signet-gold text-sm font-semibold text-black transition-all hover:bg-signet-gold-light disabled:opacity-40"
              disabled={!recipient.trim() || !amount.trim() || busy}
              onClick={() => void openReview()}
            >
              {phase === "estimating" ? "Estimating…" : "Review transfer"}
            </button>
          </div>
        </div>
      )}

      {step === "success" && success && selected && (
        <div className="glass-card-glow p-6 text-center space-y-4 reveal reveal-1">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-signet-verdant-soft">
            <span className="text-2xl">✓</span>
          </div>
          <div>
            <p className="font-heading text-lg font-semibold text-signet-text">Transaction sent</p>
            <p className="mt-1 text-sm text-signet-muted">
              {amount} {selected.token.symbol} to {shortAddr(recipient)}
            </p>
          </div>
          <p className="break-all font-mono text-xs text-signet-gold">{success.hash}</p>
          {success.explorerUrl && (
            <a
              href={success.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center text-sm font-medium text-signet-gold underline"
            >
              View on block explorer →
            </a>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="flex-1 min-h-[48px] rounded-xl border border-signet-border text-sm font-medium text-signet-muted hover:text-signet-text"
              onClick={reset}
            >
              Send another
            </button>
            <Link
              to={paths.home}
              className="flex flex-1 min-h-[48px] items-center justify-center rounded-xl bg-signet-gold text-sm font-semibold text-black"
            >
              Done
            </Link>
          </div>
        </div>
      )}

      <Modal open={reviewOpen} title="Review transfer" onClose={() => !busy && setReviewOpen(false)}>
        {review && selected && (
          <div className="space-y-4">
            <div className="rounded-xl border border-signet-border bg-signet-bg/50 px-4 py-2 divide-y divide-signet-border">
              <ReviewRow label="To" value={shortAddr(review.recipient)} mono />
              <ReviewRow label="Full address" value={review.recipient} mono />
              <ReviewRow label="Amount" value={review.amountFormatted} />
              <ReviewRow label="USD estimate" value={formatUsdEstimate(reviewUsd)} />
              <ReviewRow label="Network" value={review.chain.name} />
              <ReviewRow label="Est. network fee" value={review.fee.feeFormatted} />
            </div>

            <div className="space-y-2 rounded-xl border border-signet-warning/30 bg-signet-warning/5 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-signet-warning">Warnings</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-signet-muted">
                {review.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>

            <p className="text-[11px] text-center text-signet-muted">
              Verify every field. Signet will never ask for your recovery phrase or private key.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={busy}
                className="flex-1 min-h-[48px] rounded-xl border border-signet-border text-sm font-medium text-signet-muted hover:text-signet-text disabled:opacity-40"
                onClick={() => setReviewOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                className="flex-1 min-h-[48px] rounded-xl bg-signet-gold text-sm font-semibold text-black hover:bg-signet-gold-light disabled:opacity-40"
                onClick={() => void confirmSend()}
              >
                {phase === "confirming" || phase === "pending" ? "Signing…" : "Confirm & sign"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
