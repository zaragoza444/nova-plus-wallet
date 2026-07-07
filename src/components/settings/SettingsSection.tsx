import type { ReactNode } from "react";

export function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-2">
      <div>
        <h4 className="text-sm font-semibold text-signet-text">{title}</h4>
        {hint && <p className="mt-0.5 text-[11px] text-signet-muted">{hint}</p>}
      </div>
      <div className="glass-card divide-y divide-signet-border overflow-hidden">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  trailing,
}: {
  label: string;
  description?: string;
  trailing: ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-signet-text">{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-signet-muted">{description}</p>}
      </div>
      <div className="shrink-0">{trailing}</div>
    </div>
  );
}
