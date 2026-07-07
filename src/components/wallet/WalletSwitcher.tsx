// Signet — wallet switcher (stub; lists vaults once multi-wallet lands).
export function WalletSwitcher(): JSX.Element {
  return (
    <button
      type="button"
      aria-label="Switch wallet"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-signet-border bg-signet-surface text-signet-gold transition hover:border-signet-gold-muted"
    >
      ◆
    </button>
  );
}
