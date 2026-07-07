import { Link } from "react-router-dom";
import type { InsightDef } from "../../lib/insights";

interface AIInsightProps extends InsightDef {
  className?: string;
}

/** Contextual institutional insight — not a chat bubble. */
export function AIInsight({ title, body, action, className = "" }: AIInsightProps): JSX.Element {
  return (
    <aside
      className={`relative overflow-hidden rounded-2xl border border-signet-border bg-signet-surface/50 px-4 py-3.5 pl-5 ${className}`.trim()}
      aria-label="Insight"
    >
      <div
        className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-signet-gold via-signet-gold-bright to-signet-gold-dim"
        aria-hidden
      />
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-signet-gold-muted">Insight</p>
      <p className="mt-1 font-heading text-sm font-medium text-signet-text">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-signet-muted">{body}</p>
      {action && (
        <Link
          to={action.to}
          className="tap-target mt-2 inline-flex items-center text-xs font-medium text-signet-gold underline underline-offset-2"
        >
          {action.label} →
        </Link>
      )}
    </aside>
  );
}
