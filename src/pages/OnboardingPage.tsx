import { useState, useCallback } from "react";
import { useNavigate, Link, Navigate, useSearchParams } from "react-router-dom";
import { useWalletContext } from "../context/WalletContext";
import type { AccountType } from "../lib/keystore";
import { appReturnPath } from "../lib/routes";
import { SignetLogo } from "../components/layout/SignetLogo";

type Step = "accountType" | "mode" | "reveal" | "password";

const card = "glass-card p-5";
const primaryBtn =
  "w-full min-h-[48px] rounded-xl px-4 text-sm font-semibold transition active:scale-[0.99] disabled:opacity-40";
const goldBtn = `${primaryBtn} bg-signet-gold text-signet-bg shadow-gold-sm hover:bg-signet-gold-light`;
const burgundyBtn = `${primaryBtn} bg-signet-burgundy text-white shadow-burgundy-md hover:bg-signet-burgundy-bright`;

export function OnboardingPage(): JSX.Element {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const dest = appReturnPath(searchParams.get("next"));
  const { beginCreate, finalizeCreate, status } = useWalletContext();
  const [step, setStep] = useState<Step>("accountType");
  const [accountType, setAccountType] = useState<AccountType>("personal");
  const [mnemonic, setMnemonic] = useState("");
  const [saved, setSaved] = useState(false);
  const [loginPw, setLoginPw] = useState("");
  const [loginPw2, setLoginPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isInstitutional = accountType === "institutional";

  const startCreate = useCallback(() => {
    const { mnemonic: phrase } = beginCreate();
    setMnemonic(phrase);
    setStep("reveal");
  }, [beginCreate]);

  const submitPassword = useCallback(async () => {
    setErr("");
    if (loginPw.length < 8) return setErr("Password must be at least 8 characters.");
    if (loginPw !== loginPw2) return setErr("Passwords don't match.");
    setBusy(true);
    try {
      await finalizeCreate(loginPw, undefined, { accountType });
      nav(dest, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't create wallet.");
      setBusy(false);
    }
  }, [loginPw, loginPw2, accountType, finalizeCreate, nav, dest]);

  const words = mnemonic.split(" ");

  if (status === "unlocked") {
    return <Navigate to={dest} replace />;
  }
  if (status === "locked") {
    return <Navigate to="/locked" replace />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-signet-bg px-6 py-10 text-signet-ink grain-overlay">
      <div className="w-full max-w-sm reveal">
        {step === "accountType" && (
          <div className="text-center">
            <SignetLogo variant="mark" className="mx-auto mb-5 h-14 w-14" />
            <h1 className="font-display text-2xl font-semibold tracking-wide gold-text">Welcome to Nova+</h1>
            <p className="mb-8 mt-2 text-sm text-signet-muted">Choose how you'll use this wallet.</p>
            <div className="space-y-3 text-left">
              <button
                type="button"
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  accountType === "personal"
                    ? "border-signet-gold/50 bg-signet-gold/10 shadow-gold-sm"
                    : "glass-card border-signet-border"
                }`}
                onClick={() => setAccountType("personal")}
              >
                <p className="font-semibold text-signet-text">Personal</p>
                <p className="mt-1 text-xs text-signet-muted">One password. Partner and public chains only.</p>
              </button>
              <button
                type="button"
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  accountType === "institutional"
                    ? "border-signet-burgundy-muted bg-signet-burgundy-soft shadow-burgundy-md"
                    : "glass-card border-signet-border"
                }`}
                onClick={() => setAccountType("institutional")}
              >
                <p className="font-semibold text-signet-burgundy-bright">Institutional</p>
                <p className="mt-1 text-xs text-signet-muted">
                  One password. Banking chains unlock with the institutional gate later.
                </p>
              </button>
            </div>
            <button type="button" className={`mt-8 ${isInstitutional ? burgundyBtn : goldBtn}`} onClick={() => setStep("mode")}>
              Continue
            </button>
          </div>
        )}

        {step === "mode" && (
          <div className="text-center">
            <h1 className="font-display text-xl font-semibold">
              {isInstitutional ? "Institutional wallet" : "Personal wallet"}
            </h1>
            <p className="mb-8 mt-2 text-sm text-signet-muted">Create new or import an existing wallet.</p>
            <button type="button" className={isInstitutional ? burgundyBtn : goldBtn} onClick={startCreate}>
              Create new wallet
            </button>
            <Link
              to={`/app/import-wallet?type=${accountType}`}
              className="mt-3 block min-h-[48px] rounded-xl border border-signet-border-glow glass-card py-3 text-sm font-medium text-signet-text"
            >
              Import existing wallet
            </Link>
            <button type="button" className="mt-4 text-xs text-signet-muted" onClick={() => setStep("accountType")}>
              ← Change account type
            </button>
          </div>
        )}

        {step === "reveal" && (
          <div>
            <h1 className="font-display text-xl font-semibold">Your recovery phrase</h1>
            <p className="mb-4 mt-2 text-sm text-signet-muted">
              Write these 12 words in order. They're the only way to restore your wallet.
            </p>
            <div className={card}>
              <div className="grid grid-cols-3 gap-2">
                {words.map((w, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-signet-border bg-signet-bg-alt px-2 py-2 text-center font-mono text-xs"
                  >
                    <span className="text-signet-ink-dim">{i + 1}</span> {w}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-signet-danger/30 bg-signet-danger-soft p-3 text-xs text-signet-muted">
              Anyone with these words controls your funds. Never share them.
            </div>
            <label className="mt-4 flex min-h-[44px] items-center gap-2 text-sm text-signet-muted">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              I've written my recovery phrase down
            </label>
            <button type="button" className={`mt-4 ${isInstitutional ? burgundyBtn : goldBtn}`} disabled={!saved} onClick={() => setStep("password")}>
              Continue
            </button>
          </div>
        )}

        {step === "password" && (
          <div>
            <h1 className="font-display text-xl font-semibold">Set password</h1>
            <p className="mb-4 mt-2 text-sm text-signet-muted">
              Encrypts your wallet on this device. It cannot be recovered if forgotten.
            </p>
            <div className={card}>
              <input
                type="password"
                placeholder="Password (min 8 characters)"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                className="mb-3 w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-4 text-sm outline-none focus:border-signet-gold/50"
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
            <button type="button" className={`mt-4 ${isInstitutional ? burgundyBtn : goldBtn}`} disabled={busy} onClick={() => void submitPassword()}>
              {busy ? "Encrypting…" : "Create wallet"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
