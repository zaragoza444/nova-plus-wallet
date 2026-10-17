import { Link, Navigate } from "react-router-dom";
import { NOVA_PRODUCT_CONTACT_EMAIL } from "../../lib/brand";
import { paths } from "../../lib/routes";
import { useOnexBank } from "../../context/OnexBankContext";

const PRODUCTS = [
  { title: "OneX Bank", body: "Ledger-backed USD, EUR, and GBP accounts with member PIN session — same flow as Nova Online Bank.", to: paths.onexLogin },
  { title: "OneX Swap", body: "Exchange between fiat and ETH on the OneX ledger using settlement-mid prices.", to: paths.onexSwap },
  { title: "OneX Chain", body: "DeFi Oracle Meta · chain 138. Live RPC, deposit address, and on-chain ETH sync.", to: paths.onexChain },
];

export function OnexLandingPage(): JSX.Element {
  const { user, ready } = useOnexBank();
  if (ready && user) return <Navigate to={paths.onexApp} replace />;

  return (
    <div className="min-h-[100dvh] bg-signet-bg px-4 py-10 text-signet-text grain-overlay">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted">Banking · Swap · Chain</p>
          <h1 className="font-display text-4xl font-semibold gold-text">OneX Online Bank</h1>
          <p className="max-w-xl text-sm leading-relaxed text-signet-muted">
            Member banking with ledger wallets, virtual cards, and settlement on OneX Chain (eip155:138) — the same product surface as Nova Online Bank.
          </p>
          <p className="text-xs text-signet-muted">
            Nova X ·{" "}
            <a className="text-signet-gold" href={`mailto:${NOVA_PRODUCT_CONTACT_EMAIL}`}>
              {NOVA_PRODUCT_CONTACT_EMAIL}
            </a>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={paths.onexLogin} className="btn-primary px-8 no-underline">
              Open OneX Bank
            </Link>
            <Link to="/" className="btn-secondary no-underline">
              Nova Trusty
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {["USD", "EUR", "GBP", "ETH", "DBIS·138", "Visa virtual", "PIN session"].map((chip) => (
              <span key={chip} className="rounded-full border border-signet-border-glow bg-signet-surface/80 px-3 py-1 text-[11px] text-signet-muted">
                {chip}
              </span>
            ))}
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {PRODUCTS.map((p) => (
            <Link
              key={p.title}
              to={p.to}
              className="rounded-2xl border border-signet-border bg-signet-surface/80 p-4 no-underline transition hover:border-signet-gold/40"
            >
              <h2 className="font-heading text-base font-semibold text-signet-text">{p.title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-signet-muted">{p.body}</p>
            </Link>
          ))}
        </section>

        <section className="rounded-2xl border border-signet-border bg-signet-surface/60 p-5">
          <h2 className="font-heading text-sm font-semibold text-signet-text">How it works</h2>
          <ol className="mt-3 space-y-2 text-sm text-signet-muted">
            <li>1. Sign in with email and a 4-digit PIN — first visit creates your ledger.</li>
            <li>2. Opening fiat credit is booked on the local ledger so transfers and swaps run immediately.</li>
            <li>3. Move funds by account number, swap currencies, or issue a virtual card.</li>
            <li>4. OneX Chain 138 holds your ETH deposit address; sync pulls the live RPC balance.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
