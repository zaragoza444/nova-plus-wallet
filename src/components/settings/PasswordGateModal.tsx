import { useCallback, useState } from "react";
import { Modal } from "../common/Modal";

interface PasswordGateModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  warning?: string;
  confirmLabel?: string;
  onSubmit: (password: string) => Promise<void>;
}

export function PasswordGateModal({
  open,
  onClose,
  title,
  description,
  warning,
  confirmLabel = "Continue",
  onSubmit,
}: PasswordGateModalProps): JSX.Element | null {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPassword("");
    setError(null);
    setBusy(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const submit = useCallback(async () => {
    if (!password) return;
    setError(null);
    setBusy(true);
    try {
      await onSubmit(password);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wrong password.");
      setBusy(false);
      setPassword("");
    }
  }, [password, onSubmit, reset]);

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {description && <p className="mb-3 text-sm text-signet-muted">{description}</p>}

      {warning && (
        <div className="mb-4 rounded-xl border border-signet-danger/30 bg-signet-danger-soft px-3 py-2.5 text-xs leading-relaxed text-signet-muted">
          {warning}
        </div>
      )}

      <input
        type="password"
        autoFocus
        placeholder="Wallet password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void submit()}
        className="w-full rounded-xl border border-signet-border bg-signet-surface px-3 py-2.5 text-sm text-signet-text outline-none focus:border-signet-gold-muted"
      />

      {error && <p className="mt-2 text-xs text-signet-danger">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={handleClose} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary flex-1"
          onClick={() => void submit()}
          disabled={busy || !password}
        >
          {busy ? "Verifying…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
