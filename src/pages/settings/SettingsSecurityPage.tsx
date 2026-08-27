import { useState, useCallback } from "react";
import { useWalletContext } from "../../context/WalletContext";
import { useToast } from "../../context/ToastContext";
import { SettingsRow, SettingsSection } from "../../components/settings/SettingsSection";
import { RecoveryPhraseReveal } from "../../components/settings/RecoveryPhraseReveal";
import {
  AUTO_LOCK_OPTIONS,
  getSettings,
  saveSettings,
  type AutoLockMinutes,
} from "../../lib/settings";

export function SettingsSecurityPage(): JSX.Element {
  const { changePassword, lock } = useWalletContext();
  const { pushToast } = useToast();
  const [autoLock, setAutoLock] = useState<AutoLockMinutes>(() => getSettings().autoLockMinutes);

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const handleAutoLock = (value: AutoLockMinutes) => {
    setAutoLock(value);
    saveSettings({ autoLockMinutes: value });
    pushToast({
      title: "Auto-lock updated",
      body: value === 0 ? "Wallet will not lock automatically." : `Locks after ${value} minute(s) idle.`,
      tone: "info",
    });
  };

  const submitPasswordChange = useCallback(async () => {
    setChangeError(null);
    if (newPw.length < 8) {
      setChangeError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== newPw2) {
      setChangeError("New passwords don't match.");
      return;
    }
    setChanging(true);
    try {
      await changePassword(oldPw, newPw);
      setOldPw("");
      setNewPw("");
      setNewPw2("");
      pushToast({ title: "Password changed", body: "Your wallet password was updated.", tone: "success" });
    } catch {
      setChangeError("Wrong password or could not re-encrypt wallet.");
    } finally {
      setChanging(false);
    }
  }, [oldPw, newPw, newPw2, changePassword, pushToast]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-base font-semibold text-signet-text">Security</h3>
        <p className="mt-1 text-xs text-signet-muted">Password, auto-lock, and recovery phrase access.</p>
      </div>

      <SettingsSection title="Auto-lock" hint="Optional idle lock. Refresh keeps you signed in. Lock still requires your password.">
        <SettingsRow
          label="Idle timeout"
          description="Never (default) stays signed in on this device until you tap Lock."
          trailing={
            <select
              className="rounded-lg border border-signet-border bg-signet-surface px-2 py-1.5 text-xs text-signet-text"
              value={autoLock}
              onChange={(e) => handleAutoLock(Number(e.target.value) as AutoLockMinutes)}
            >
              {AUTO_LOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          }
        />
      </SettingsSection>

      <SettingsSection title="Change password" hint="Re-encrypts your keystore with a new password.">
        <div className="space-y-3 px-4 py-4">
          <input
            type="password"
            placeholder="Current password"
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm"
            autoComplete="current-password"
          />
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm"
            autoComplete="new-password"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={newPw2}
            onChange={(e) => setNewPw2(e.target.value)}
            className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm"
            autoComplete="new-password"
          />
          {changeError && <p className="text-xs text-signet-danger">{changeError}</p>}
          <button
            type="button"
            className="btn-primary w-full"
            disabled={changing || !oldPw || !newPw || !newPw2}
            onClick={() => void submitPasswordChange()}
          >
            {changing ? "Updating…" : "Update password"}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Recovery phrase"
        hint="Shown only after password confirmation. Auto-hides after two minutes."
      >
        <div className="px-4 py-4">
          <RecoveryPhraseReveal lockAfterDismiss onLock={lock} />
        </div>
      </SettingsSection>
    </div>
  );
}
