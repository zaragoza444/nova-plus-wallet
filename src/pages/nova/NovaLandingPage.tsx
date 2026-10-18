import { Link, Navigate } from "react-router-dom";
import { NOVA_PRODUCT_CONTACT_EMAIL } from "../../lib/brand";
import { paths } from "../../lib/routes";
import { useNovaBank } from "../../context/NovaBankContext";

const PRODUCTS = [
  { title: "Accounts", body: "USD, EUR, and GBP balances on the live Nova Online Bank ledger.", to: paths.novaLogin },
  { title: "Transfer", body: "Send to a 4-digit account number. The bank posts the movement immediately.", to: paths.novaTransfer },
  { title: "Cards", body: "Issue a virtual Visa linked to a fiat account.", to: paths.novaCards },
];

export function NovaLandingPage(): JSX.Element {
  const { user, ready } = useNovaBank();
  if (ready && user) return <Navigate to={paths.novaApp} replace />;

  return (
    <div className="min-h-[100dvh] bg-signet-bg px-4 py-10 text-signet-text grain-overlay">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted">Nova Online Bank</p>
          <h1 className="font-display text-4xl font-semibold gold-text">Member banking</h1>
          <p className="max-w-xl text-sm leading-relaxed text-signet-muted">
            Sign in with the same email and 4-digit PIN you use at Nova Online Bank. Balances, transfers, exchanges, and cards are live bank funds.
          </p>
          <p className="text-xs text-signet-muted">
            Nova X ·{" "}
            <a className="text-signet-gold" href={`mailto:${NOVA_PRODUCT_CONTACT_EMAIL}`}>
              {NOVA_PRODUCT_CONTACT_EMAIL}
            </a>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to={paths.novaLogin} className="btn-primary px-8 no-underline">
              Open Nova Online Bank
            </Link>
            <Link to={paths.banks} className="btn-secondary no-underline">
              Banks
            </Link>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {["USD", "EUR", "GBP", "Live funds", "Visa", "PIN session"].map((chip) => (
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
            <li>1. Sign in with email and a 4-digit PIN. A name is required the first time an email is registered.</li>
            <li>2. The wallet talks to the Nova Online Bank API. This is the production ledger, not a local sandbox.</li>
            <li>3. Move funds by account number, exchange between your accounts, or issue a virtual card.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
