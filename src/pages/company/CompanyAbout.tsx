import { company } from "../../lib/company";

const facts = [
  ["Legal name", company.legalName],
  ["Company number", company.number],
  ["Incorporated", company.incorporated],
  ["Registered in", company.jurisdiction],
  ["Company type", company.type],
  ["Founding subscriber", company.subscriber],
] as const;

export function CompanyAbout(): JSX.Element {
  return (
    <div className="max-w-2xl space-y-8">
      <header className="space-y-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted">Company</p>
        <h1 className="font-display text-4xl font-semibold gold-text">{company.displayName}</h1>
        <p className="text-sm leading-relaxed text-signet-muted">
          Public identity taken from the certificate of incorporation and the memorandum of association.
        </p>
      </header>

      <dl className="divide-y divide-signet-border rounded-2xl border border-signet-border bg-signet-surface/80">
        {facts.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-4 sm:grid-cols-[12rem_1fr] sm:items-baseline">
            <dt className="text-xs uppercase tracking-wider text-signet-muted">{label}</dt>
            <dd className="text-sm text-signet-text">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
