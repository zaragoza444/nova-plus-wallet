import { formatUnits, parseUnits } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ConnectWallet } from "../components/wallet/ConnectWallet";
import { Modal } from "../components/common/Modal";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { AIInsight } from "../components/common/AIInsight";
import { INSIGHTS } from "../lib/insights";
import { useWalletContext } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { useEnabledChains } from "../hooks/useEnabledChains";
import { getChain } from "../lib/chains";
import { paths } from "../lib/routes";
import { connectActiveWallet } from "../lib/transfer";
import {
  fetchOneInchQuote,
  fetchOneInchSwapTx,
  getSwapTokens,
  isOneInchSwapAvailable,
  isOneInchUnsupportedNetwork,
  oneinchConfigured,
  ONEINCH_CHAIN_IDS,
  unsupportedNetworkLabel,
} from "../lib/swap/oneinch";
import { usesGlobalSwap } from "../lib/swap/globalSwap";
import { isSettlementMetaChain, SETTLEMENT_META_CHAIN_IDS } from "../lib/settlement-meta";
import { MetaSettlementSwap } from "../components/swap/MetaSettlementSwap";
import type { TokenConfig } from "../types";

const SLIPPAGE_OPTS = [0.1, 0.5, 1] as const;

function defaultSwapChain(current: number, enabledIds: number[]): number {
  if (isSettlementMetaChain(current) && enabledIds.includes(current)) return current;
  if (isOneInchSwapAvailable(current) && enabledIds.includes(current)) return current;
  const meta = SETTLEMENT_META_CHAIN_IDS.find((id) => enabledIds.includes(id));
  if (meta) return meta;
  const first = ONEINCH_CHAIN_IDS.find((id) => enabledIds.includes(id));
  return first ?? 1;
}

export function SwapPage(): JSX.Element {
  const { address, chainId, setChainId, isWatchOnly } = useWalletContext();
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const { enabledIds } = useEnabledChains();

  const swapNetworks = useMemo(
    () =>
      [...SETTLEMENT_META_CHAIN_IDS, ...ONEINCH_CHAIN_IDS]
        .filter((id) => enabledIds.includes(id))
        .map((id) => getChain(id))
        .filter(Boolean),
    [enabledIds],
  );

  const [swapChainId, setSwapChainId] = useState(() => defaultSwapChain(chainId, enabledIds));
  const [fromAddr, setFromAddr] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState<number>(0.5);
  const [customSlip, setCustomSlip] = useState("");
  const [quoteOut, setQuoteOut] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const swapAvailable = isOneInchSwapAvailable(swapChainId);
  const metaSwap = isSettlementMetaChain(swapChainId);
  const walletUnsupported = isOneInchUnsupportedNetwork(chainId);
  const tokens: TokenConfig[] = useMemo(
    () => (swapAvailable ? getSwapTokens(swapChainId) : []),
    [swapAvailable, swapChainId],
  );

  useEffect(() => {
    setSwapChainId((prev) => {
      if (isSettlementMetaChain(prev) && enabledIds.includes(prev)) return prev;
      if (isOneInchSwapAvailable(prev) && enabledIds.includes(prev)) return prev;
      return defaultSwapChain(chainId, enabledIds);
    });
  }, [chainId, enabledIds]);

  useEffect(() => {
    const cid = Number(searchParams.get("chainId"));
    const tokenAddr = searchParams.get("token");
    if (Number.isFinite(cid) && (isOneInchSwapAvailable(cid) || isSettlementMetaChain(cid))) {
      setSwapChainId(cid);
      setChainId(cid);
    }
    if (tokenAddr) setFromAddr(tokenAddr);
  }, [searchParams, setChainId]);

  useEffect(() => {
    if (!tokens.length) {
      setFromAddr("");
      setToAddr("");
      return;
    }
    if (!fromAddr || !tokens.some((t) => t.address.toLowerCase() === fromAddr.toLowerCase())) {
      setFromAddr(tokens[0]!.address);
    }
    if (!toAddr || !tokens.some((t) => t.address.toLowerCase() === toAddr.toLowerCase())) {
      setToAddr(tokens[1]?.address ?? tokens[0]!.address);
    }
  }, [tokens, fromAddr, toAddr]);

  const fromMeta = tokens.find((t) => t.address.toLowerCase() === fromAddr.toLowerCase());
  const toMeta = tokens.find((t) => t.address.toLowerCase() === toAddr.toLowerCase());
  const swapChain = getChain(swapChainId);

  const effectiveSlippage = useMemo(() => {
    if (customSlip.trim()) {
      const n = Number(customSlip);
      return Number.isFinite(n) && n > 0 && n <= 50 ? n : slippage;
    }
    return slippage;
  }, [customSlip, slippage]);

  const refreshQuote = useCallback(async () => {
    if (!swapAvailable || !oneinchConfigured() || !fromMeta || !toMeta || !amountIn.trim()) {
      setQuoteOut(null);
      setQuoteFailed(false);
      setQuoteLoading(false);
      return;
    }
    if (fromAddr.toLowerCase() === toAddr.toLowerCase()) {
      setQuoteOut(null);
      setQuoteFailed(true);
      setQuoteLoading(false);
      return;
    }
    setQuoteLoading(true);
    setQuoteFailed(false);
    try {
      const amt = parseUnits(amountIn.trim(), fromMeta.decimals).toString();
      const q = await fetchOneInchQuote({
        chainId: swapChainId,
        src: fromAddr,
        dst: toAddr,
        amount: amt,
      });
      if (!q?.dstAmount) {
        setQuoteOut(null);
        setQuoteFailed(true);
      } else {
        setQuoteOut(formatUnits(BigInt(q.dstAmount), toMeta.decimals));
        setQuoteFailed(false);
      }
    } catch {
      setQuoteOut(null);
      setQuoteFailed(true);
    } finally {
      setQuoteLoading(false);
    }
  }, [swapAvailable, swapChainId, fromAddr, toAddr, amountIn, fromMeta, toMeta]);

  useEffect(() => {
    const t = setTimeout(() => void refreshQuote(), 400);
    return () => clearTimeout(t);
  }, [refreshQuote]);

  const swapDirection = () => {
    const a = fromAddr;
    setFromAddr(toAddr);
    setToAddr(a);
  };

  const handleNetworkChange = (id: number) => {
    setSwapChainId(id);
    setChainId(id);
    setQuoteOut(null);
    setQuoteFailed(false);
  };

  const runSwap = async () => {
    if (!address || !fromMeta || !toMeta || !quoteOut) return;
    if (!oneinchConfigured()) {
      pushToast({ title: "API key required", body: "Set VITE_1INCH_API_KEY to execute swaps.", tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const amt = parseUnits(amountIn.trim(), fromMeta.decimals).toString();
      const tx = await fetchOneInchSwapTx({
        chainId: swapChainId,
        src: fromAddr,
        dst: toAddr,
        amount: amt,
        from: address,
        slippage: effectiveSlippage,
      });
      if (!tx) {
        pushToast({ title: "No swap route", body: "1inch could not build this swap.", tone: "error" });
        return;
      }
      const signer = connectActiveWallet(swapChainId);
      const sent = await signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: BigInt(tx.value || "0"),
      });
      pushToast({ title: "Swap submitted", body: sent.hash, tone: "success" });
      setConfirmOpen(false);
      setAmountIn("");
      setQuoteOut(null);
    } catch (e) {
      pushToast({
        title: "Swap failed",
        body: e instanceof Error ? e.message : "Transaction failed.",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const rateDisplay = useMemo(() => {
    if (!quoteOut || !amountIn.trim() || !fromMeta || !toMeta) return "—";
    const inN = Number(amountIn);
    const outN = Number(quoteOut);
    if (!Number.isFinite(inN) || inN <= 0 || !Number.isFinite(outN)) return "—";
    return `${(outN / inN).toLocaleString(undefined, { maximumFractionDigits: 6 })} ${toMeta.symbol}`;
  }, [quoteOut, amountIn, fromMeta, toMeta]);

  if (!address) return <ConnectWallet />;

  if (isWatchOnly) {
    return (
      <PageShell width="lg">
        <PageHeader
          eyebrow="Swap"
          title="Watch-only owner"
          description="Quotes are visible after you import the owner key. This device currently has no signer for the Nova Plus Wallet owner."
        />
        <EmptyState
          title="Cannot swap without a signing key"
          description={address}
          action={{ label: "Import owner wallet", to: paths.importWallet }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell width="lg">
      <PageHeader
        eyebrow="Swap"
        title="Swap tokens"
        description="Nova settlement meta on NovaONE & NRW World · 1inch on public EVM."
      />
      <AIInsight {...INSIGHTS.swap} className="reveal reveal-1" />

      {(walletUnsupported || usesGlobalSwap(chainId)) && !metaSwap && (
        <div className="rounded-2xl border border-signet-gold/40 bg-signet-gold/5 px-4 py-3 text-sm reveal reveal-1">
          <p className="font-semibold text-signet-gold">Nova / ALLTRA Global Swap</p>
          <p className="mt-1 text-signet-muted">
            {usesGlobalSwap(chainId)
              ? `${unsupportedNetworkLabel(chainId)} trades popular ETH, BNB, and TRX hubs via ALLTRA Global Swap — not 1inch.`
              : `Your wallet network is ${unsupportedNetworkLabel(chainId)}. Use Global Swap for Nova/ALLTRA majors, or Bridge for mesh custody hops.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link to={paths.swap} className="inline-flex font-medium text-signet-gold underline">
              Open in-wallet swap →
            </Link>
            <Link to={paths.bridge} className="inline-flex font-medium text-signet-muted underline">
              Open Bridge →
            </Link>
            <Link to={paths.send} className="inline-flex font-medium text-signet-muted underline">
              External Send →
            </Link>
          </div>
        </div>
      )}

      {!oneinchConfigured() && !metaSwap && (
        <div className="glass-card border border-signet-warning/30 p-4 reveal reveal-1">
          <p className="text-sm font-semibold text-signet-warning">1inch API key required</p>
          <p className="mt-1 text-sm text-signet-muted">
            Add <span className="font-mono text-signet-text">VITE_1INCH_API_KEY</span> to your
            environment to fetch live quotes and execute swaps. Without it, Nova Plus Wallet will not show
            output amounts.
          </p>
        </div>
      )}

      {metaSwap ? (
        <div className="space-y-4 reveal reveal-1">
          <label className="block">
            <span className="text-[11px] font-medium text-signet-muted">Network</span>
            <select
              className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
              value={swapChainId}
              onChange={(e) => handleNetworkChange(Number(e.target.value))}
            >
              {swapNetworks.map((c) => (
                <option key={c!.id} value={c!.id}>
                  {c!.name} ({c!.id})
                </option>
              ))}
            </select>
          </label>
          <MetaSettlementSwap chainId={swapChainId} />
        </div>
      ) : !swapAvailable ? (
        <EmptyState
          icon="⇄"
          title="Swap unavailable"
          description={`1inch does not aggregate on ${unsupportedNetworkLabel(swapChainId)}. Move assets via Bridge instead.`}
          action={{ label: "Open Bridge", to: paths.bridge }}
        />
      ) : swapNetworks.length === 0 ? (
        <EmptyState
          title="No swap networks"
          description="Enable a public EVM network in Settings to swap."
          action={{ label: "Network settings", to: paths.settingsNetwork }}
        />
      ) : (
        <div className="glass-card p-5 space-y-4 reveal reveal-1">
          <label className="block">
            <span className="text-[11px] font-medium text-signet-muted">Network</span>
            <select
              className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
              value={swapChainId}
              onChange={(e) => handleNetworkChange(Number(e.target.value))}
            >
              {swapNetworks.map((c) => (
                <option key={c!.id} value={c!.id}>
                  {c!.name} ({c!.id})
                </option>
              ))}
            </select>
          </label>

          {tokens.length < 2 ? (
            <p className="rounded-xl border border-signet-border bg-signet-bg/50 px-4 py-3 text-sm text-signet-muted">
              No swappable token pairs configured for {swapChain?.name ?? "this network"}.
            </p>
          ) : (
            <>
              <label className="block">
                <span className="text-[11px] font-medium text-signet-muted">From</span>
                <select
                  className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 font-mono text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={fromAddr}
                  onChange={(e) => setFromAddr(e.target.value)}
                >
                  {tokens.map((t) => (
                    <option key={t.address} value={t.address}>{t.symbol}</option>
                  ))}
                </select>
              </label>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-signet-border bg-signet-surface text-lg text-signet-gold transition-all hover:border-signet-gold/40 hover:shadow-gold-sm active:scale-90"
                  onClick={swapDirection}
                  aria-label="Swap direction"
                >
                  ↕
                </button>
              </div>

              <label className="block">
                <span className="text-[11px] font-medium text-signet-muted">To</span>
                <select
                  className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 font-mono text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={toAddr}
                  onChange={(e) => setToAddr(e.target.value)}
                >
                  {tokens.map((t) => (
                    <option key={t.address} value={t.address}>{t.symbol}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[11px] font-medium text-signet-muted">Amount</span>
                <input
                  type="text"
                  inputMode="decimal"
                  className="mt-1.5 w-full min-h-[48px] rounded-xl border border-signet-border bg-signet-bg px-3.5 font-mono text-sm text-signet-text placeholder:text-signet-dim focus:border-signet-gold/50 focus:outline-none"
                  placeholder="0.00"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                />
              </label>

              <div>
                <p className="text-[11px] font-medium text-signet-muted">Slippage tolerance</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SLIPPAGE_OPTS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSlippage(s); setCustomSlip(""); }}
                      className={`min-h-[40px] rounded-xl border px-3.5 text-sm font-medium transition-all ${
                        slippage === s && !customSlip
                          ? "border-signet-gold bg-signet-gold/10 text-signet-gold"
                          : "border-signet-border text-signet-muted hover:text-signet-text"
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                  <input
                    className="min-h-[40px] w-24 rounded-xl border border-signet-border bg-signet-bg px-3 font-mono text-sm text-signet-text placeholder:text-signet-dim focus:border-signet-gold/50 focus:outline-none"
                    placeholder="Custom"
                    value={customSlip}
                    onChange={(e) => setCustomSlip(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-signet-border bg-signet-bg/50 p-4 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-signet-muted">You receive</span>
                  {quoteLoading ? (
                    <span className="text-sm text-signet-muted">…</span>
                  ) : (
                    <span className="font-mono font-semibold text-signet-text">
                      {quoteOut != null ? `${quoteOut} ${toMeta?.symbol ?? ""}` : "—"}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-signet-muted">Rate</span>
                  <span className="text-signet-muted">
                    1 {fromMeta?.symbol} ≈ {rateDisplay}
                  </span>
                </div>
                {!oneinchConfigured() && (
                  <p className="text-[11px] text-signet-warning">
                    Add VITE_1INCH_API_KEY for live quotes.
                  </p>
                )}
                {oneinchConfigured() && quoteFailed && amountIn.trim() && !quoteLoading && (
                  <p className="text-[11px] text-signet-muted">
                    No route from 1inch for this pair and amount.
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={!quoteOut || !oneinchConfigured() || quoteLoading || busy}
                className="w-full min-h-[48px] rounded-xl bg-signet-gold text-sm font-semibold text-black transition-all hover:bg-signet-gold-light disabled:opacity-40"
                onClick={() => setConfirmOpen(true)}
              >
                Review swap
              </button>
            </>
          )}
        </div>
      )}

      <Modal open={confirmOpen} title="Confirm swap" onClose={() => !busy && setConfirmOpen(false)}>
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-signet-border bg-signet-bg/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-signet-muted">Network</span>
              <span className="font-semibold text-signet-text">{swapChain?.name ?? swapChainId}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-signet-muted">You pay</span>
              <span className="font-mono font-semibold text-signet-text">
                {amountIn} {fromMeta?.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-signet-muted">You receive</span>
              <span className="font-mono font-semibold text-signet-text">
                {quoteOut ?? "—"} {toMeta?.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-signet-muted">Slippage</span>
              <span className="text-signet-text">{effectiveSlippage}%</span>
            </div>
          </div>
          <p className="text-[11px] text-signet-muted text-center">
            Quote from 1inch. This action is irreversible once confirmed on-chain.
          </p>
          <button
            type="button"
            disabled={busy || !quoteOut}
            className="w-full min-h-[48px] rounded-xl bg-signet-gold text-sm font-semibold text-black transition-all hover:bg-signet-gold-light disabled:opacity-40"
            onClick={() => void runSwap()}
          >
            {busy ? "Signing…" : "Confirm swap"}
          </button>
        </div>
      </Modal>
    </PageShell>
  );
}
