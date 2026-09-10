import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { paths } from "../../lib/routes";
import { useOnexBank } from "../../context/OnexBankContext";

export function OnexLoginPage(): JSX.Element {
  const { user, ready, startSession, apiBase } = useOnexBank();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && user) return <Navigate to={paths.onexApp} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await startSession(email.trim(), pin.trim(), fullName.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-signet-bg px-4 grain-overlay">
      <form onSubmit={(e) => void onSubmit(e)} className="w-full max-w-md space-y-5 rounded-2xl border border-signet-border bg-signet-surface p-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted">OneX Online Bank</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold text-signet-text">Member sign-in</h1>
          <p className="mt-1 text-xs text-signet-muted">
            Same session model as Nova Online Bank: email + 4-digit PIN. New members need a name.
          </p>
          <p className="mt-2 font-mono text-[11px] text-signet-gold-muted">API {apiBase ?? "searching…"}</p>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] text-signet-muted">Email</span>
          <input
            required
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-signet-border bg-signet-bg px-3 py-2.5 text-sm text-signet-text"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-signet-muted">Full name (first visit)</span>
          <input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-signet-border bg-signet-bg px-3 py-2.5 text-sm text-signet-text"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] text-signet-muted">4-digit PIN</span>
          <input
            required
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={4}
            pattern="\d{4}"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="w-full rounded-xl border border-signet-border bg-signet-bg px-3 py-2.5 text-sm tracking-[0.4em] text-signet-text"
          />
        </label>
        {error && <p className="text-sm text-signet-danger">{error}</p>}
        <button type="submit" disabled={busy || pin.length !== 4} className="btn-primary w-full">
          {busy ? "Opening…" : "Continue"}
        </button>
        <Link to={paths.onex} className="block text-center text-xs text-signet-muted no-underline hover:text-signet-gold">
          Back to OneX Bank
        </Link>
      </form>
    </div>
  );
}
