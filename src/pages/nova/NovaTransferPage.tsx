import { FormEvent, useState } from "react";
import { useNovaBank } from "../../context/NovaBankContext";

export function NovaTransferPage(): JSX.Element {
  const { accounts, transferByAccount } = useNovaBank();
  const fiat = accounts.filter((a) => a.currency !== "ETH");
  const [fromId, setFromId] = useState(fiat[0]?.id ?? "");
  const [toNumber, setToNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await transferByAccount(fromId, toNumber.trim(), amount.trim(), pin, reference.trim() || undefined);
      setMsg("Transfer posted to Nova Online Bank.");
      setAmount("");
      setToNumber("");
      setPin("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-lg space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Transfer</h1>
      <p className="text-xs text-signet-muted">Send by 4-digit account number. PIN required. This moves live funds.</p>
      <label className="block space-y-1">
        <span className="text-[11px] text-signet-muted">From</span>
        <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm">
          {fiat.map((a) => (
            <option key={a.id} value={a.id}>
              {a.currency} #{a.accountNumber} · {a.balance}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-signet-muted">To account number</span>
        <input value={toNumber} onChange={(e) => setToNumber(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm" required />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-signet-muted">Amount</span>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm" required />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-signet-muted">Reference</span>
        <input value={reference} onChange={(e) => setReference(e.target.value)} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm" />
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-signet-muted">PIN</span>
        <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm tracking-[0.4em]" required />
      </label>
      {msg && <p className="text-sm text-signet-muted">{msg}</p>}
      <button type="submit" disabled={busy || pin.length !== 4} className="btn-primary w-full">{busy ? "Sending…" : "Send"}</button>
    </form>
  );
}
