import { Link } from "react-router-dom";
import { useWalletContext } from "../../context/WalletContext";
import { paths } from "../../lib/routes";
import { useFAFO } from "../../hooks/useFAFO";
import { FAFOBadge } from "../fafo/FAFOBadge";
import { AddressDisplay } from "../common/AddressDisplay";
import { AccountSwitcher } from "../wallet/AccountSwitcher";
import { WalletSwitcher } from "../wallet/WalletSwitcher";
import { NetworkSwitcher } from "../wallet/NetworkSwitcher";
import { SignetLogo } from "./SignetLogo";
import { brandProductName } from "../../lib/brand";

export function Header(): JSX.Element {
  const { address, mode, isInstitutional, gateUnlocked } = useWalletContext();
  const fafo = useFAFO(address ?? undefined, 45_000);

  return (
    <header className="sticky top-0 z-40 border-b border-signet-border bg-signet-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5">
        <Link to={paths.home} className="flex min-h-[44px] items-center gap-2.5">
          <SignetLogo variant="mark" className="h-8 w-8" />
          <span className="font-heading text-lg font-semibold tracking-tight text-signet-text">
            {brandProductName()}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {address ? (
            <>
              {isInstitutional && (
                <span
                  className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline ${
                    gateUnlocked
                      ? "border-signet-burgundy-muted bg-signet-burgundy-soft text-signet-burgundy-bright"
                      : "border-signet-border bg-signet-surface text-signet-muted"
                  }`}
                >
                  Institutional
                </span>
              )}
              {mode === "walletconnect" && (
                <span className="rounded-full border border-signet-primary/30 bg-signet-primary/5 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-signet-primary">
                  WC
                </span>
              )}
              <FAFOBadge statuses={fafo.statuses} />
              <WalletSwitcher />
              <AccountSwitcher />
              <NetworkSwitcher />
              <AddressDisplay address={address} />
            </>
          ) : (
            <span className="text-xs text-signet-muted">Not connected</span>
          )}
        </div>
      </div>
    </header>
  );
}
