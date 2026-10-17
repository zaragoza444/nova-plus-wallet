import { Link } from "react-router-dom";
import { company, companyChains, companyProducts } from "../../lib/company";

const actionClass = "btn-primary w-fit px-6 no-underline";

export function CompanyHome(): JSX.Element {
  return (
    <div className="space-y-12">
      <header className="max-w-2xl space-y-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted">
          {company.number} · {company.jurisdiction}
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-wide gold-text sm:text-5xl">
          {company.displayName}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-signet-muted">{company.summary}</p>
      </header>

      <section id="products" className="grid gap-3 sm:grid-cols-2">
        {companyProducts.map((product) => (
          <article
            key={product.name}
            className="flex flex-col rounded-2xl border border-signet-border bg-signet-surface/80 p-5"
          >
            <h2 className="font-heading text-lg font-semibold text-signet-text">{product.name}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-signet-muted">{product.body}</p>
            {"href" in product ? (
              <a href={product.href} className={`${actionClass} mt-5`}>
                {product.cta}
              </a>
            ) : (
              <Link to={product.to} className={`${actionClass} mt-5`}>
                {product.cta}
              </Link>
            )}
          </article>
        ))}
      </section>

      <section id="chains" className="space-y-4">
        <h2 className="font-heading text-lg font-semibold text-signet-text">Chains</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {companyChains.map((chain) => (
            <article key={chain.id} className="rounded-2xl border border-signet-border bg-signet-surface/80 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signet-gold-muted">
                Chain {chain.id}
              </p>
              <h3 className="mt-2 font-heading text-lg font-semibold text-signet-text">
                {chain.name} · {chain.symbol}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-signet-muted">
                Native {chain.symbol} on chain {chain.id}. Swap opens on this chain after the wallet is unlocked.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <Link to={chain.to} className={actionClass}>
                  Swap {chain.symbol}
                </Link>
                {chain.explorer ? (
                  <a
                    href={chain.explorer}
                    className="text-xs text-signet-gold no-underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Explorer
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
