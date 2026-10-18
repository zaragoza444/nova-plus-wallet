import { Link } from "react-router-dom";
import { paths } from "../../lib/routes";
import { useNovaBank } from "../../context/NovaBankContext";

export function NovaDashboardPage(): JSX.Element {
  const { accounts, transfers, apiBase } = useNovaBank();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Accounts</h1>
        <p className="text-xs text-signet-muted">Live balances · API {apiBase ?? "offline"}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((a) => (
          <div key={a.id} className="rounded-2xl border border-signet-border bg-signet-surface p-4">
            <p className="text-[11px] uppercase tracking-wider text-signet-muted">{a.name}</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {a.balance} <span className="text-sm text-signet-muted">{a.currency}</span>
            </p>
            <p className="mt-2 font-mono text-[11px] text-signet-gold-muted">#{a.accountNumber}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link to={paths.novaTransfer} className="btn-primary no-underline">Send</Link>
        <Link to={paths.novaSwap} className="btn-secondary no-underline">Swap</Link>
        <Link to={paths.novaCards} className="btn-secondary no-underline">Cards</Link>
      </div>
      <section className="rounded-2xl border border-signet-border bg-signet-surface/70 p-4">
        <h2 className="text-sm font-semibold">Recent activity</h2>
        {transfers.length === 0 ? (
          <p className="mt-2 text-xs text-signet-muted">No transfers yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-signet-border">
            {transfers.slice(0, 8).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-signet-muted">{t.kind} · {t.reference}</span>
                <span className="tabular-nums">
                  {t.amount} {t.currency}
                  {t.amountOut ? ` → ${t.amountOut} ${t.toCurrency}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
