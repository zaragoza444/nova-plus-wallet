import { useWalletContext } from "../../context/WalletContext";
import { SettingsSection } from "../../components/settings/SettingsSection";
import { RecoveryPhraseReveal } from "../../components/settings/RecoveryPhraseReveal";

export function SettingsBackupPage(): JSX.Element {
  const { address, lock } = useWalletContext();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-base font-semibold text-signet-text">Backup</h3>
        <p className="mt-1 text-xs text-signet-muted">
          Your recovery phrase is the only way to restore this wallet if you lose access to this device.
        </p>
      </div>

      <SettingsSection title="This wallet">
        <div className="px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">Address</p>
          <p className="mt-1 break-all font-mono text-sm text-signet-text">{address}</p>
        </div>
      </SettingsSection>

      <SettingsSection title="Recovery phrase backup" hint="Password required. Never store digitally unless encrypted.">
        <div className="space-y-3 px-4 py-4 text-sm text-signet-muted">
          <ul className="list-inside list-disc space-y-1 text-xs">
            <li>Write the phrase on paper and store it offline in a secure place.</li>
            <li>Do not email, cloud-sync, or screenshot your phrase.</li>
            <li>Signet never uploads your keys — backup is your responsibility.</li>
          </ul>
          <RecoveryPhraseReveal lockAfterDismiss onLock={lock} />
        </div>
      </SettingsSection>
    </div>
  );
}
