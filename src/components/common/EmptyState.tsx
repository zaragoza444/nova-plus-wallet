import { Link } from "react-router-dom";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: { label: string; to: string };
}

export function EmptyState({ icon = "◆", title, description, action }: EmptyStateProps): JSX.Element {
  return (
    <div className="glass-card px-6 py-10 text-center">
      <p className="font-display text-3xl leading-none text-signet-gold-muted" aria-hidden>
        {icon}
      </p>
      <h2 className="mt-4 font-heading text-lg font-semibold text-signet-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-signet-muted">{description}</p>
      {action && (
        <Link
          to={action.to}
          className="tap-target mt-5 inline-flex items-center justify-center text-sm font-medium text-signet-gold underline underline-offset-2"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
