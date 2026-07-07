// Signet — FAFO status badge. Defensive about the statuses shape so it never crashes.
export function FAFOBadge({ statuses }: { statuses?: unknown }): JSX.Element | null {
  let issues = 0;
  if (Array.isArray(statuses)) {
    issues = statuses.filter((s) => {
      if (s && typeof s === "object" && "ok" in s) return (s as { ok: unknown }).ok === false;
      return false;
    }).length;
  }
  const tone = issues > 0
    ? "border-signet-warning/30 bg-signet-warning-soft text-signet-warning"
    : "border-signet-verdant/30 bg-signet-verdant-soft text-signet-verdant";
  return (
    <span className={`flex min-h-[28px] items-center gap-1 rounded-full border px-2.5 text-[10px] font-medium uppercase tracking-wider ${tone}`} title="FAFO preflight">
      FAFO{issues > 0 ? ` ${issues}` : ""}
    </span>
  );
}
