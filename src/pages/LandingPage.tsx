import { Link, Navigate } from "react-router-dom";
import { paths } from "../lib/routes";
import { brandProductName, brandTagline } from "../lib/brand";
import { SignetLogo } from "../components/layout/SignetLogo";
import { NOVA_PLUS_WALLET_OWNER } from "../lib/walletOwner";
import { useWalletContext } from "../context/WalletContext";

export function LandingPage(): JSX.Element {
  const name = brandProductName();
  const { status } = useWalletContext();

  if (status === "unlocked") {
    return <Navigate to={paths.home} replace />;
  }
  if (status === "locked") {
    return <Navigate to="/locked" replace />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-signet-bg px-6 py-10 text-center text-signet-ink grain-overlay">
      <div className="reveal w-full max-w-md">
        <div className="mb-6">
          <SignetLogo variant="mark" className="mx-auto mb-4 h-16 w-16" />
          <h1 className="font-display text-4xl font-semibold tracking-wide gold-text">{name}</h1>
        </div>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-signet-muted">{brandTagline()}</p>
        <p className="mx-auto mt-3 max-w-sm break-all font-mono text-[11px] text-signet-gold">
          Owner {NOVA_PLUS_WALLET_OWNER}
        </p>
        <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3">
          <Link
            to={paths.home}
            className="btn-primary inline-flex min-w-[200px] justify-center px-10 text-base no-underline shadow-gold-md"
          >
            Open Nova Plus Wallet
          </Link>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to={paths.send}
              className="rounded-full border border-signet-border-glow bg-signet-surface/80 px-4 py-2 text-xs font-medium text-signet-text no-underline"
            >
              Send
            </Link>
            <Link
              to={paths.receive}
              className="rounded-full border border-signet-border-glow bg-signet-surface/80 px-4 py-2 text-xs font-medium text-signet-text no-underline"
            >
              Receive
            </Link>
            <Link
              to={paths.swap}
              className="rounded-full border border-signet-gold/40 bg-signet-gold/10 px-4 py-2 text-xs font-medium text-signet-gold no-underline"
            >
              Swap
            </Link>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {["NovaONE", "NRW", "ALLTRA", "ETH · BNB · TRX"].map((c) => (
            <span
              key={c}
              className="rounded-full border border-signet-border-glow bg-signet-surface/80 px-3 py-1 text-[11px] text-signet-muted"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
