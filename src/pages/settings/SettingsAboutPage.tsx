import { NOVA_PLUS_WALLET_OWNER } from "../../lib/walletOwner";
import { brandProductName } from "../../lib/brand";
import { useWalletContext } from "../../context/WalletContext";

export function SettingsAboutPage(): JSX.Element {
  const { address, isOwnerWallet, status } = useWalletContext();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-base font-semibold text-signet-text">About</h3>
        <p className="mt-1 text-xs leading-relaxed text-signet-muted">
          {brandProductName()} is a production self-custody wallet. Your vault is encrypted on this
          device. After you unlock, this browser tab stays signed in across refresh until you lock
          it or close the tab.
        </p>
      </div>
      <div className="rounded-2xl border border-signet-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-signet-muted">This device</p>
        <p className="mt-2 text-xs text-signet-text">
          Status: {status === "unlocked" ? "unlocked — you can send and swap" : status}
        </p>
        {address && (
          <p className="mt-2 break-all font-mono text-xs text-signet-muted">{address}</p>
        )}
      </div>
      <div className="rounded-2xl border border-signet-gold/30 bg-signet-gold/10 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-signet-gold">Treasury address</p>
        <p className="mt-2 break-all font-mono text-xs text-signet-text">{NOVA_PLUS_WALLET_OWNER}</p>
        {isOwnerWallet ? (
          <p className="mt-2 text-xs text-signet-muted">This vault controls the treasury address.</p>
        ) : (
          <p className="mt-2 text-xs text-signet-muted">
            Import that wallet’s recovery phrase or private key to send from it. Watching an address
            is not enough.
          </p>
        )}
      </div>
    </div>
  );
}
