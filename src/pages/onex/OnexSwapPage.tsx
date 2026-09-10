import { FormEvent, useMemo, useState } from "react";
import { useOnexBank } from "../../context/OnexBankContext";
import { onexSendJson, apiMessage } from "../../lib/onex-api";

export function OnexSwapPage(): JSX.Element {
  const { accounts, exchange, apiBase } = useOnexBank();
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const from = useMemo(() => accounts.find((a) => a.id === fromId), [accounts, fromId]);
  const to = useMemo(() => accounts.find((a) => a.id === toId), [accounts, toId]);

  const preview = async () => {
    if (!apiBase || !from || !to) return;
    const result = await onexSendJson(`${apiBase}/markets/quote`, "POST", { from: from.currency, to: to.currency, amount });
    if (!result.ok) {
      setQuote(apiMessage(result.body, "Quote failed"));
      return;
    }
    const body = result.body as { amountOut?: string; to?: string };
    setQuote(`Receive ${body.amountOut} ${body.to ?? to.currency}`);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await exchange(fromId, toId, amount.trim());
      setMsg("Swap booked on the OneX ledger.");
      setAmount("");
      setQuote(null);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mx-auto max-w-lg space-y-4">
      <h1 className="font-heading text-2xl font-semibold">OneX Swap</h1>
      <p className="text-xs text-signet-muted">Settlement-mid quote (CoinGecko ETH + fiat pegs, 30 bps) — ledger execute, same rail style as Nova Bank.</p>
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
      <button type="button" className="btn-secondary w-full" onClick={() => void preview()}>Quote</button>
      {quote && <p className="text-sm text-signet-gold">{quote}</p>}
      {msg && <p className="text-sm text-signet-muted">{msg}</p>}
      <button type="submit" disabled={busy || fromId === toId} className="btn-primary w-full">{busy ? "Booking…" : "Execute swap"}</button>
    </form>
  );
}
