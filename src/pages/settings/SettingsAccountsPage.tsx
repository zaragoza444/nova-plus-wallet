import { useState } from "react";
import { useWalletContext, accountDisplayLabel } from "../../context/WalletContext";
import { useToast } from "../../context/ToastContext";
import { SettingsSection } from "../../components/settings/SettingsSection";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 10)}…${addr.slice(-8)}`;
}

export function SettingsAccountsPage(): JSX.Element {
  const {
    address,
    accounts,
    activeAccountIndex,
    supportsHdAccounts,
    switchAccount,
    addAccount,
    renameAccount,
  } = useWalletContext();
  const { pushToast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const startEdit = (index: number, currentLabel?: string) => {
    setEditingIndex(index);
    setDraftLabel(currentLabel ?? "");
  };

  const saveLabel = (index: number) => {
    renameAccount(index, draftLabel);
    setEditingIndex(null);
    pushToast({ title: "Label saved", tone: "success" });
  };

  const handleAdd = async () => {
    setAdding(true);
    try {
      await addAccount();
      pushToast({ title: "Account added", body: "Switched to the new account.", tone: "success" });
    } catch (e) {
      pushToast({
        title: "Could not add account",
        body: e instanceof Error ? e.message : "Unknown error",
        tone: "error",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h3 className="font-heading text-lg font-semibold text-signet-text">Accounts</h3>
        <p className="mt-1 text-sm text-signet-muted">
          HD accounts share one recovery phrase. Switch from the header dropdown or here.
        </p>
      </div>

      <SettingsSection title="Your accounts" hint="Each account has its own address derived from your phrase.">
        <ul className="divide-y divide-signet-border">
          {accounts.map((record) => {
            const active = record.index === activeAccountIndex;
            return (
              <li key={record.index} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {editingIndex === record.index ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={draftLabel}
                          onChange={(e) => setDraftLabel(e.target.value)}
                          placeholder={accountDisplayLabel(record)}
                          className="min-h-[36px] flex-1 rounded-lg border border-signet-border bg-signet-bg px-2 text-sm"
                        />
                        <button
                          type="button"
                          className="rounded-lg bg-signet-gold px-3 text-xs font-semibold text-black"
                          onClick={() => saveLabel(record.index)}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-signet-text">
                          {accountDisplayLabel(record)}
                          {active && (
                            <span className="ml-2 rounded-full bg-signet-gold/15 px-2 py-0.5 text-[10px] font-medium text-signet-gold">
                              Active
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] text-signet-muted">{shortAddr(record.address)}</p>
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    {!active && (
                      <button
                        type="button"
                        className="rounded-lg border border-signet-border px-2.5 py-1 text-[11px] text-signet-text hover:border-signet-gold/40"
                        onClick={() => switchAccount(record.index)}
                      >
                        Switch
                      </button>
                    )}
                    {editingIndex !== record.index && (
                      <button
                        type="button"
                        className="rounded-lg px-2.5 py-1 text-[11px] text-signet-muted hover:text-signet-text"
                        onClick={() => startEdit(record.index, record.label)}
                      >
                        Rename
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </SettingsSection>

      {supportsHdAccounts ? (
        <button
          type="button"
          disabled={adding}
          className="w-full min-h-[48px] rounded-xl border border-dashed border-signet-gold/40 bg-signet-gold-dim/10 text-sm font-semibold text-signet-gold transition hover:border-signet-gold/60 disabled:opacity-60"
          onClick={() => void handleAdd()}
        >
          {adding ? "Adding…" : "+ Add account"}
        </button>
      ) : (
        <p className="rounded-xl border border-signet-border bg-signet-surface px-4 py-3 text-xs text-signet-muted">
          This wallet was imported from a private key, so only one account is available. Import or create
          from a recovery phrase to use multiple accounts.
        </p>
      )}

      {address && (
        <p className="text-center font-mono text-[10px] text-signet-muted">
          Active: {shortAddr(address)}
        </p>
      )}
    </div>
  );
}
