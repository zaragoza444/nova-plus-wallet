import { useState, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useWalletContext } from "../context/WalletContext";
import type { AccountType } from "../lib/keystore";
import { paths } from "../lib/routes";
import { SignetLogo } from "../components/layout/SignetLogo";

export function ImportWalletPage(): JSX.Element {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { importWallet } = useWalletContext();
  const accountType: AccountType = params.get("type") === "institutional" ? "institutional" : "personal";
  const isInstitutional = accountType === "institutional";

  const [secret, setSecret] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginPw2, setLoginPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = useCallback(async () => {
    setErr("");
    if (!secret.trim()) return setErr("Enter your recovery phrase or private key.");
    if (loginPw.length < 8) return setErr("Password must be at least 8 characters.");
    if (loginPw !== loginPw2) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      await importWallet(secret, loginPw, undefined, { accountType });
      nav(paths.home, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't import wallet.");
      setBusy(false);
    }
  }, [secret, loginPw, loginPw2, accountType, importWallet, nav]);

  const btnClass = isInstitutional
    ? "w-full min-h-[48px] rounded-xl bg-signet-burgundy text-sm font-semibold text-white shadow-burgundy-md hover:bg-signet-burgundy-bright disabled:opacity-40"
    : "w-full min-h-[48px] rounded-xl bg-signet-gold text-sm font-semibold text-signet-bg shadow-gold-sm hover:bg-signet-gold-light disabled:opacity-40";

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-signet-bg px-6 py-10 text-signet-ink grain-overlay">
      <div className="w-full max-w-sm reveal">
        <SignetLogo variant="mark" className="mx-auto mb-5 h-12 w-12" />
        <h1 className="text-center font-display text-xl font-semibold">Import wallet</h1>
        <p className="mb-6 mt-2 text-center text-sm text-signet-muted">
          {isInstitutional ? "Institutional" : "Personal"} — paste recovery phrase or private key.
        </p>
        <div className="glass-card space-y-3 p-5">
          <textarea
            placeholder="Recovery phrase or private key"
            rows={3}
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full resize-none rounded-xl border border-signet-border bg-signet-bg px-4 py-3 font-mono text-sm outline-none focus:border-signet-gold/50"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={loginPw}
            onChange={(e) => setLoginPw(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-4 text-sm outline-none focus:border-signet-gold/50"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={loginPw2}
            onChange={(e) => setLoginPw2(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-4 text-sm outline-none focus:border-signet-gold/50"
          />
        </div>
        {err && <p className="mt-3 text-xs text-signet-danger">{err}</p>}
        <button type="button" className={`mt-4 ${btnClass}`} disabled={busy} onClick={() => void submit()}>
          {busy ? "Encrypting…" : "Import wallet"}
        </button>
        <Link to="/onboarding" className="mt-4 block text-center text-sm text-signet-muted">
          ← Back
        </Link>
      </div>
    </div>
  );
}
