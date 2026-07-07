import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Link, useSearchParams } from "react-router-dom";
import { ConnectWallet } from "../components/wallet/ConnectWallet";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";
import { QRSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { AIInsight } from "../components/common/AIInsight";
import { INSIGHTS } from "../lib/insights";
import { useWalletContext } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { useEnabledChains } from "../hooks/useEnabledChains";
import type { ChainDef } from "../lib/chains";
import { paths } from "../lib/routes";

function ChainOption({ chain }: { chain: ChainDef }): JSX.Element {
  return (
    <option value={chain.id}>
      {chain.name} ({chain.id}) · {chain.nativeCurrency.symbol}
    </option>
  );
}

export function ReceivePage(): JSX.Element {
  const { address, chainId, setChainId } = useWalletContext();
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const { enabledChains } = useEnabledChains();
  const [qr, setQr] = useState<string | null>(null);

  const receiveChains = useMemo(
    () => [...enabledChains].sort((a, b) => a.name.localeCompare(b.name)),
    [enabledChains],
  );

  const selectedChain = useMemo(
    () => receiveChains.find((c) => c.id === chainId) ?? receiveChains[0] ?? null,
    [receiveChains, chainId],
  );

  useEffect(() => {
    if (!receiveChains.length) return;
    if (!receiveChains.some((c) => c.id === chainId)) {
      setChainId(receiveChains[0]!.id);
    }
  }, [receiveChains, chainId, setChainId]);

  useEffect(() => {
    const fromUrl = Number(searchParams.get("chainId"));
    if (Number.isFinite(fromUrl) && receiveChains.some((c) => c.id === fromUrl)) {
      setChainId(fromUrl);
    }
  }, [searchParams, receiveChains, setChainId]);

  useEffect(() => {
    if (!address) {
      setQr(null);
      return;
    }
    void QRCode.toDataURL(address, {
      margin: 2,
      width: 280,
      color: { dark: "#C9A84C", light: "#08080C" },
    }).then(setQr);
  }, [address]);

  const copyAddress = () => {
    if (!address) return;
    void navigator.clipboard.writeText(address).then(
      () => pushToast({ title: "Address copied", tone: "success" }),
      () => pushToast({ title: "Copy failed", tone: "error" }),
    );
  };

  if (!address) return <ConnectWallet />;

  return (
    <PageShell width="lg">
      <PageHeader
        eyebrow="Receive"
        title="Receive tokens"
        description="Share your address on the correct network so funds arrive safely."
      />
      <AIInsight {...INSIGHTS.receive} className="reveal reveal-1" />

      {receiveChains.length === 0 ? (
        <EmptyState
          title="No receive networks"
          description="Enable at least one network in Settings to display a deposit address."
          action={{ label: "Network settings", to: paths.settingsNetwork }}
        />
      ) : (
        <>
          <div className="glass-card p-5 space-y-4 reveal reveal-1">
            <label className="block">
              <span className="text-[11px] font-medium text-signet-muted">Receiving network</span>
              <div className="relative mt-1.5">
                {selectedChain && (
                  <span
                    className="pointer-events-none absolute left-3.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                    style={{ background: selectedChain.iconColor }}
                  />
                )}
                <select
                  className="w-full min-h-[48px] appearance-none rounded-xl border border-signet-border bg-signet-bg py-2 pl-8 pr-10 text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={selectedChain?.id ?? ""}
                  onChange={(e) => setChainId(Number(e.target.value))}
                >
                  {receiveChains.map((chain) => (
                    <ChainOption key={chain.id} chain={chain} />
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-signet-muted">
                  ▾
                </span>
              </div>
            </label>

            {selectedChain && (
              <div className="rounded-xl border border-signet-warning/40 bg-signet-warning/5 px-4 py-3 text-sm">
                <p className="font-semibold text-signet-warning">Network-specific deposit</p>
                <p className="mt-1 text-signet-muted">
                  Only receive assets on{" "}
                  <span className="font-semibold text-signet-text">{selectedChain.name}</span>{" "}
                  <span className="font-mono text-[11px]">(chain ID {selectedChain.id})</span>.
                  Tokens sent on another network may be permanently lost.
                </p>
              </div>
            )}
          </div>

          <div className="glass-card-glow p-6 text-center space-y-5 reveal reveal-2">
            {qr ? (
              <div className="mx-auto inline-block rounded-2xl border border-signet-border-glow bg-signet-bg p-3">
                <img src={qr} alt="Receive address QR code" className="h-56 w-56 rounded-xl" />
              </div>
            ) : (
              <QRSkeleton />
            )}

            <div className="space-y-2 text-left">
              <p className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">
                Your address
              </p>
              <p className="break-all rounded-xl border border-signet-border bg-signet-surface px-4 py-3 font-mono text-xs text-signet-gold">
                {address}
              </p>
            </div>

            <button
              type="button"
              className="w-full min-h-[48px] rounded-xl bg-signet-gold text-sm font-semibold text-black transition-all hover:bg-signet-gold-light active:scale-[0.98]"
              onClick={copyAddress}
            >
              Copy address
            </button>

            {selectedChain && (
              <p className="text-[11px] text-signet-muted">
                Confirm the sender selects{" "}
                <span className="font-medium text-signet-text">{selectedChain.name}</span> before
                they broadcast the transaction.
              </p>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}
