import { useState } from "react";
import { useWalletContext } from "../../context/WalletContext";
import { isInstitutionalGateConfigured } from "../../lib/institutionalGate";

export function InstitutionalGatePrompt({ onSuccess }: { onSuccess?: () => void }): JSX.Element {
  const { enterInstitutionalGate, isInstitutional } = useWalletContext();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const configured = isInstitutionalGateConfigured();

  if (!isInstitutional) return <></>;

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      await enterInstitutionalGate(value);
      setValue("");
      onSuccess?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not verify institutional gate.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card border border-signet-burgundy-muted/30 bg-signet-burgundy-soft p-5 shadow-burgundy-md">
      <p className="font-mono text-[10px] uppercase tracking-wider text-signet-burgundy-bright">Institutional</p>
      <h2 className="mt-1 font-heading text-base font-semibold text-signet-text">Banking access gate</h2>
      <p className="mt-1 text-xs text-signet-muted">
        Enter the institutional gate to reveal private banking chains and the Banks directory.
      </p>
      {!configured && (
        <p className="mt-3 rounded-lg border border-signet-warning/30 bg-signet-warning-soft px-3 py-2 text-xs text-signet-warning">
          Gate not configured — set <code className="font-mono">VITE_INSTITUTIONAL_GATE</code> in{" "}
          <code className="font-mono">.env.local</code> (SHA-256 hex of the gate value).
        </p>
      )}
      <input
        type="password"
        placeholder="Institutional gate"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-4 w-full min-h-[44px] rounded-xl border border-signet-burgundy-muted/40 bg-signet-bg px-4 text-sm outline-none focus:border-signet-burgundy"
      />
      {err && (
        <p role="alert" className="mt-2 text-xs text-signet-danger">
          {err}
        </p>
      )}
      <button
        type="button"
        disabled={busy || !value || !configured}
        className="mt-4 w-full min-h-[44px] rounded-xl bg-signet-burgundy text-sm font-semibold text-white transition hover:bg-signet-burgundy-bright disabled:opacity-50"
        onClick={() => void submit()}
      >
        {busy ? "Verifying…" : "Unlock banking access"}
      </button>
    </div>
  );
}

/** @deprecated */
export { InstitutionalGatePrompt as PrivateAccessPrompt };
