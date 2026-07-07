interface FAFOStatusProps {
  statuses: any[];
  loading: boolean;
  error: any;
}

export function FAFOStatus({ statuses, loading, error }: FAFOStatusProps): JSX.Element {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-signet-muted">
        <div className="h-3 w-3 animate-spin rounded-full border border-signet-gold border-t-transparent" />
        Loading FAFO status…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-signet-danger">
        Failed to load FAFO status.
      </div>
    );
  }

  if (!statuses || statuses.length === 0) {
    return (
      <div className="text-sm text-signet-muted">
        No FAFO rules active.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {statuses.map((s, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg bg-signet-surface px-3 py-2 text-sm"
        >
          <span className="text-signet-text">{s.label ?? `Rule ${i + 1}`}</span>
          <span
            className={`font-medium ${s.active ? "text-signet-danger" : "text-signet-verdant"}`}
          >
            {s.active ? "Enforced" : "Clear"}
          </span>
        </div>
      ))}
    </div>
  );
}
