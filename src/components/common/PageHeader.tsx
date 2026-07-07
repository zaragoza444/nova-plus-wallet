import { Link } from "react-router-dom";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  backTo?: { label: string; href: string };
}

export function PageHeader({ eyebrow, title, description, backTo }: PageHeaderProps): JSX.Element {
  return (
    <header className="reveal">
      {backTo && (
        <Link
          to={backTo.href}
          className="tap-target inline-flex items-center text-[11px] font-medium text-signet-muted transition-colors hover:text-signet-gold"
        >
          {backTo.label}
        </Link>
      )}
      <p
        className={`font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted ${backTo ? "mt-2" : ""}`}
      >
        {eyebrow}
      </p>
      <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-signet-text">{title}</h1>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-signet-muted">{description}</p>}
    </header>
  );
}
