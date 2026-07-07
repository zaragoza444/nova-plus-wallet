interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label }: LoadingSpinnerProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-signet-gold border-t-transparent" />
      {label && (
        <span className="text-xs text-signet-muted">{label}</span>
      )}
    </div>
  );
}
