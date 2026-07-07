import { useCallback, useEffect, useState } from "react";
import { revealMnemonicWithPassword, type RevealSecretResult } from "../../lib/keystore";
import { PasswordGateModal } from "./PasswordGateModal";

const REVEAL_WARNING =
  "Anyone with your recovery phrase controls all funds in this wallet. Never share it, screenshot it, or enter it on any website. Make sure no one is watching your screen.";

interface RecoveryPhraseRevealProps {
  /** Called after a successful reveal (e.g. to close parent panel). */
  onRevealed?: () => void;
  /** Lock wallet after the reveal panel is dismissed. */
  lockAfterDismiss?: boolean;
  onLock?: () => void;
}

export function RecoveryPhraseReveal({
  onRevealed,
  lockAfterDismiss,
  onLock,
}: RecoveryPhraseRevealProps): JSX.Element {
  const [gateOpen, setGateOpen] = useState(false);
  const [revealed, setRevealed] = useState<RevealSecretResult | null>(null);
  const [copied, setCopied] = useState(false);

  const dismiss = useCallback(() => {
    setRevealed(null);
    setCopied(false);
    if (lockAfterDismiss) onLock?.();
  }, [lockAfterDismiss, onLock]);

  useEffect(() => {
    if (!revealed) return;
    const id = window.setTimeout(dismiss, 120_000);
    return () => window.clearTimeout(id);
  }, [revealed, dismiss]);

  const handleVerify = useCallback(async (password: string) => {
    try {
      const result = await revealMnemonicWithPassword(password);
      setGateOpen(false);
      setRevealed(result);
      onRevealed?.();
    } catch {
      throw new Error("Wrong password.");
    }
  }, [onRevealed]);

  const words = revealed?.kind === "mnemonic" ? revealed.phrase.split(" ") : [];

  return (
    <>
      {!revealed ? (
        <button type="button" className="btn-secondary w-full" onClick={() => setGateOpen(true)}>
          Reveal recovery phrase
        </button>
      ) : revealed.kind === "mnemonic" ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-signet-danger/30 bg-signet-danger-soft px-3 py-2.5 text-xs text-signet-muted">
            {REVEAL_WARNING}
          </div>
          <div className="rounded-xl border border-signet-border bg-signet-bg-alt p-3">
            <div className="grid grid-cols-3 gap-2">
              {words.map((w, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-signet-border bg-signet-surface px-2 py-2 text-center font-mono text-xs text-signet-text"
                >
                  <span className="text-signet-muted">{i + 1}.</span> {w}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={async () => {
                await navigator.clipboard.writeText(revealed.phrase);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied" : "Copy phrase"}
            </button>
            <button type="button" className="btn-primary flex-1" onClick={dismiss}>
              Hide phrase
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-signet-muted">{revealed.message}</p>
          <button type="button" className="btn-secondary w-full" onClick={dismiss}>
            Dismiss
          </button>
        </div>
      )}

      <PasswordGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title="Confirm your password"
        description="Enter your wallet password to view your recovery phrase."
        warning={REVEAL_WARNING}
        confirmLabel="Reveal phrase"
        onSubmit={handleVerify}
      />
    </>
  );
}
