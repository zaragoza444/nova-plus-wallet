import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useWalletContext } from "../../context/WalletContext";
import {
  accountDisplayLabel,
  getAccountRecords,
  subscribeAccountsChanged,
} from "../../lib/accounts";
import { paths } from "../../lib/routes";
import { DropdownPanel } from "../common/DropdownPanel";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function AccountSwitcher(): JSX.Element | null {
  const {
    address,
    activeAccountIndex,
    accounts,
    supportsHdAccounts,
    switchAccount,
    addAccount,
  } = useWalletContext();
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeAccountsChanged(() => setTick((n) => n + 1)), []);
  void tick;

  if (!address) return null;

  const records = accounts.length ? accounts : getAccountRecords();
  const active =
    records.find((a) => a.index === activeAccountIndex) ?? records[0] ?? { index: 0, address };
  const label = accountDisplayLabel(active);

  const handleSwitch = (index: number) => {
    switchAccount(index);
    setOpen(false);
  };

  const handleAdd = () => {
    void addAccount().then(() => setOpen(false));
  };

  return (
    <DropdownPanel
      open={open}
      onClose={() => setOpen(false)}
      widthClass="w-72"
      trigger={({ expanded, controlId }) => (
        <button
          type="button"
          id={controlId}
          aria-expanded={expanded}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-[36px] max-w-[120px] items-center gap-1.5 rounded-full border border-signet-border bg-signet-surface px-3 text-xs text-signet-ink transition hover:border-signet-gold/40 sm:max-w-none"
        >
          <span className="truncate font-medium">{label}</span>
          <span className="text-[10px] text-signet-muted">{expanded ? "▴" : "▾"}</span>
        </button>
      )}
    >
      <div className="border-b border-signet-border px-3 py-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-signet-muted">Accounts</p>
      </div>
      <ul className="py-1">
        {records.map((record) => {
          const selected = record.index === activeAccountIndex;
          return (
            <li key={record.index}>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleSwitch(record.index)}
                className={`flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition ${
                  selected ? "bg-signet-gold/10" : "hover:bg-signet-surface"
                }`}
              >
                <span className={`text-xs font-medium ${selected ? "text-signet-gold" : "text-signet-text"}`}>
                  {accountDisplayLabel(record)}
                </span>
                <span className="font-mono text-[10px] text-signet-muted">{shortAddr(record.address)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {supportsHdAccounts && (
        <div className="border-t border-signet-border p-2">
          <button
            type="button"
            className="w-full min-h-[40px] rounded-lg border border-dashed border-signet-gold/40 text-xs font-semibold text-signet-gold transition hover:bg-signet-gold/5"
            onClick={() => void handleAdd()}
          >
            + Add account
          </button>
        </div>
      )}
      <div className="border-t border-signet-border p-2">
        <Link
          to={paths.settingsAccounts}
          className="block rounded-lg px-3 py-2 text-center text-[11px] text-signet-muted transition hover:bg-signet-surface hover:text-signet-text"
          onClick={() => setOpen(false)}
        >
          Manage accounts →
        </Link>
      </div>
    </DropdownPanel>
  );
}
