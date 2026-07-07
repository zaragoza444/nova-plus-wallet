// Signet — Locked screen (real). Decrypt the vault with the password to unlock.
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWalletContext } from "../context/WalletContext";
import { paths } from "../lib/routes";
import { SignetLogo } from "../components/layout/SignetLogo";

const goldBg = { background: "linear-gradient(135deg,#C9A84C,#E8D48B)" };

export function LockedPage(): JSX.Element {
  const nav = useNavigate();
  const { unlock } = useWalletContext();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = useCallback(async () => {
    setErr("");
    setBusy(true);
    try {
      await unlock(pw);
      nav(paths.home, { replace: true });
    } catch {
      setErr("Wrong password.");
      setBusy(false);
      setPw("");
    }
  }, [pw, unlock, nav]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-signet-bg px-6 text-center text-signet-ink">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-signet-border-glow bg-signet-surface p-2">
        <SignetLogo variant="mark" className="h-10 w-10" />
      </div>
      <h1 className="mb-2 font-display text-xl font-semibold">Wallet locked</h1>
      <p className="mb-6 text-sm text-signet-muted">Enter your password to unlock.</p>
      <input
        type="password"
        placeholder="Password"
        value={pw}
        autoFocus
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="mb-3 w-full max-w-xs rounded-xl border border-signet-border bg-signet-surface px-4 py-3 text-sm text-signet-ink outline-none focus:border-signet-gold-muted"
      />
      {err && <p className="mb-3 text-xs text-signet-danger">{err}</p>}
      <button className="w-full max-w-xs rounded-xl px-4 py-3 text-sm font-medium text-signet-bg transition active:scale-[0.99] disabled:opacity-40"
        style={goldBg} disabled={busy || !pw} onClick={submit}>
        {busy ? "Unlocking…" : "Unlock"}
      </button>
    </div>
  );
}
