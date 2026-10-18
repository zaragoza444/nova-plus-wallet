import { FormEvent, useMemo, useState } from "react";
import { useNovaBank } from "../../context/NovaBankContext";

export function NovaSwapPage(): JSX.Element {
  const { accounts, exchange } = useNovaBank();
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const from = useMemo(() => accounts.find((a) => a.id === fromId), [accounts, fromId]);
  const to = useMemo(() => accounts.find((a) => a.id === toId), [accounts, toId]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await exchange(fromId, toId, amount.trim());
      setMsg(`Exchange posted${from && to ? ` from ${from.currency} to ${to.currency}` : ""}. The bank applied its live rate.`);
      setAmount("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Exchange failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-lg space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Exchange</h1>
      <p className="text-xs text-signet-muted">Move value between your Nova Online Bank accounts. The production ledger sets the rate when the exchange is booked.</p>
      <label className="block space-y-1">
        <span className="text-[11px] text-signet-muted">From</span>
        <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.currency} · {a.balance}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-signet-muted">To</span>
        <select value={toId} onChange={(e) => setToId(e.target.value)} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm">
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.currency} · {a.balance}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] text-signet-muted">Amount</span>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm" required />
      </label>
      {msg && <p className="text-sm text-signet-muted">{msg}</p>}
      <button type="submit" disabled={busy || fromId === toId} className="btn-primary w-full">{busy ? "Booking…" : "Execute exchange"}</button>
    </form>
  );
}
