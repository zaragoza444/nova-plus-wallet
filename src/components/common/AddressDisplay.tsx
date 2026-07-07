// Signet — truncated address pill with copy.
import { useState } from "react";

export function AddressDisplay({ address }: { address: string }): JSX.Element {
  const [copied, setCopied] = useState(false);
  const short = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="flex min-h-[36px] items-center gap-1.5 rounded-full border border-signet-border bg-signet-surface px-3 font-mono text-xs text-signet-muted transition hover:border-signet-border-strong"
      aria-label="Copy address"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-signet-verdant" />
      {copied ? "Copied" : short}
    </button>
  );
}
