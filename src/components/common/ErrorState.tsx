interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps): JSX.Element {
  return (
    <div className="glass-card border-signet-danger/20 px-6 py-10 text-center" role="alert">
      <p className="font-display text-3xl leading-none text-signet-danger" aria-hidden>
        !
      </p>
      <h2 className="mt-4 font-heading text-lg font-semibold text-signet-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-signet-muted">{description}</p>
      {onRetry && (
        <button type="button" className="btn-secondary tap-target mt-5" onClick={onRetry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
