import { useToast } from "../../context/ToastContext";
import { SettingsRow, SettingsSection } from "../../components/settings/SettingsSection";
import { SettingsToggle } from "../../components/settings/SettingsToggle";
import { ManageHiddenTokens } from "../../components/tokens/ManageHiddenTokens";
import {
  DISPLAY_CURRENCY_OPTIONS,
  saveSettings,
  type DisplayCurrency,
} from "../../lib/settings";
import { savePrefs } from "../../lib/prefs";
import { useDisplaySettings } from "../../hooks/useDisplaySettings";

export function SettingsDisplayPage(): JSX.Element {
  const { pushToast } = useToast();
  const prefs = useDisplaySettings();
  const { displayCurrency, hideSmallBalances, smallBalanceUsdThreshold, spamFilterEnabled } = prefs;

  const handleCurrency = (value: DisplayCurrency) => {
    saveSettings({ displayCurrency: value });
    pushToast({ title: "Display currency", body: `Balances shown in ${value}.`, tone: "info" });
  };

  const handleHideSmall = (next: boolean) => {
    savePrefs({ hideSmallBalances: next });
  };

  const handleThreshold = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    savePrefs({ smallBalanceUsdThreshold: n });
  };

  const handleSpamFilter = (next: boolean) => {
    savePrefs({ spamFilterEnabled: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading text-base font-semibold text-signet-text">Display</h3>
        <p className="mt-1 text-xs text-signet-muted">How portfolio values appear across Nova+.</p>
      </div>

      <SettingsSection title="Currency" hint="Values are priced in USD internally, then converted for display.">
        <SettingsRow
          label="Display currency"
          trailing={
            <select
              className="max-w-[11rem] rounded-lg border border-signet-border bg-signet-surface px-2 py-1.5 text-xs text-signet-text"
              value={displayCurrency}
              onChange={(e) => handleCurrency(e.target.value as DisplayCurrency)}
            >
              {DISPLAY_CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          }
        />
      </SettingsSection>

      <SettingsSection title="Balances">
        <SettingsRow
          label="Hide small balances"
          description="Hides tokens below your USD threshold from lists and portfolio total."
          trailing={
            <SettingsToggle
              checked={hideSmallBalances}
              onChange={handleHideSmall}
              label="Hide small balances"
            />
          }
        />
        <SettingsRow
          label="Small balance threshold"
          description="USD equivalent — tokens below this are hidden when the toggle is on."
          trailing={
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-signet-muted">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                disabled={!hideSmallBalances}
                className="w-20 rounded-lg border border-signet-border bg-signet-surface px-2 py-1.5 text-xs text-signet-text disabled:opacity-50"
                value={smallBalanceUsdThreshold}
                onChange={(e) => handleThreshold(e.target.value)}
              />
            </div>
          }
        />
        <SettingsRow
          label="Spam filter"
          description="Hides zero-value unlisted tokens with a non-zero on-chain balance."
          trailing={
            <SettingsToggle
              checked={spamFilterEnabled}
              onChange={handleSpamFilter}
              label="Spam filter"
            />
          }
        />
      </SettingsSection>

      <SettingsSection
        title="Manage hidden tokens"
        hint="Tokens you hid from the dashboard and assets list. Unhide to show them again."
      >
        <div className="px-4 py-4">
          <ManageHiddenTokens />
        </div>
      </SettingsSection>
    </div>
  );
}
