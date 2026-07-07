import { useWalletContext } from "../../context/WalletContext";

/**
 * DEV ONLY — wipes the local vault and reloads so onboarding can be re-tested.
 * Never enable in production builds without guardrails.
 */
export function SettingsAdvancedPage(): JSX.Element {
  const { wipe } = useWalletContext();

  const handleReset = () => {
    const ok = window.confirm(
      "DEV ONLY: Permanently delete this wallet from this browser? You will need your recovery phrase to restore it.",
    );
    if (!ok) return;
    wipe();
    window.location.reload();
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h3 className="font-heading text-lg font-semibold text-signet-text">Advanced</h3>
        <p className="mt-1 text-sm text-signet-muted">Developer tools and experimental options.</p>
      </div>

      <section className="glass-card space-y-3 border border-signet-warning/30 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-signet-warning">Dev only</p>
          <h4 className="mt-1 text-sm font-semibold text-signet-text">Reset wallet</h4>
          <p className="mt-1 text-xs text-signet-muted">
            Clears the encrypted vault, accounts manifest, and session state on this device, then reloads the app
            so you can walk through onboarding again.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="w-full min-h-[44px] rounded-xl border border-signet-danger/40 bg-signet-danger-soft text-sm font-semibold text-signet-danger transition hover:border-signet-danger/60"
        >
          Reset wallet (dev)
        </button>
      </section>
    </div>
  );
}
