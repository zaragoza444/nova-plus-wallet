import { useState } from "react";
import { useNovaBank } from "../../context/NovaBankContext";

export function NovaCardsPage(): JSX.Element {
  const { accounts, cards, issueCard } = useNovaBank();
  const fiat = accounts.filter((a) => a.currency !== "ETH");
  const [linked, setLinked] = useState(fiat[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const selected = fiat.find((a) => a.id === linked);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Cards</h1>
      <p className="text-xs text-signet-muted">Virtual Visa cards issued by Nova Online Bank and linked to a fiat account.</p>
      {cards.map((c) => (
        <div key={c.id} className="rounded-2xl border border-signet-border bg-gradient-to-br from-signet-burgundy-dark to-signet-surface p-5">
          <p className="font-mono text-lg tracking-widest">{c.masked || `•••• ${c.last4}`}</p>
          <p className="mt-2 text-xs text-signet-muted">{c.currency} · {c.status}{c.virtual ? " · virtual" : ""}</p>
        </div>
      ))}
      <select value={linked} onChange={(e) => setLinked(e.target.value)} className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm">
        {fiat.map((a) => (
          <option key={a.id} value={a.id}>{a.currency} #{a.accountNumber}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn-primary w-full"
        disabled={busy || !linked || !selected}
        onClick={() => {
          if (!selected) return;
          setBusy(true);
          setMsg(null);
          void issueCard(linked, selected.currency)
            .then(() => setMsg("Virtual card issued."))
            .catch((e: unknown) => setMsg(e instanceof Error ? e.message : "Failed"))
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Issuing…" : "Issue virtual card"}
      </button>
      {msg && <p className="text-sm text-signet-muted">{msg}</p>}
    </div>
  );
}
