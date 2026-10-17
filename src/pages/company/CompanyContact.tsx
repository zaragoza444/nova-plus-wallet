import { company } from "../../lib/company";

export function CompanyContact(): JSX.Element {
  return (
    <div className="max-w-xl space-y-6">
      <header className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted">Contact</p>
        <h1 className="font-display text-4xl font-semibold gold-text">Write to the company</h1>
        <p className="text-sm leading-relaxed text-signet-muted">
          {company.displayName} answers product questions for Nova+, Nova X, Nova Swap, Nova Bridge, and Nova AI Builder at one address.
        </p>
      </header>
      <a href={`mailto:${company.email}`} className="btn-primary w-fit px-8 no-underline">
        {company.email}
      </a>
    </div>
  );
}
