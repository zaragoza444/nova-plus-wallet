import { Modal } from "../common/Modal";
import type { BridgePreview } from "../../lib/bridge/execute";

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-signet-border/60 py-2.5 last:border-0">
      <span className="text-[11px] font-medium uppercase tracking-wide text-signet-muted">{label}</span>
      <span className={`max-w-[60%] text-right text-sm text-signet-text ${mono ? "break-all font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}

interface BridgeReviewModalProps {
  open: boolean;
  onClose: () => void;
  preview: BridgePreview | null;
  busy: boolean;
  onConfirm: () => void;
}

export function BridgeReviewModal({
  open,
  onClose,
  preview,
  busy,
  onConfirm,
}: BridgeReviewModalProps): JSX.Element | null {
  if (!preview) return null;

  return (
    <Modal open={open} onClose={onClose} title="Review bridge">
      <div className="space-y-1">
        <ReviewRow label="Path" value={`${preview.pathLabel} (${preview.fromChainName} → ${preview.toChainName})`} />
        <ReviewRow label="Token" value={preview.tokenSymbol} />
        <ReviewRow label="Amount" value={preview.amountFormatted} />
        <ReviewRow label="Recipient" value={preview.recipient} mono />
        <ReviewRow label="Portal" value={preview.portalAddress} mono />
      </div>

      {preview.warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-signet-gold/20 bg-signet-gold/5 px-3 py-2.5 text-xs leading-relaxed text-signet-muted">
          {preview.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="button" className="btn-primary flex-1" onClick={onConfirm} disabled={busy}>
          {busy ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Confirming…
            </span>
          ) : (
            "Confirm bridge"
          )}
        </button>
      </div>
    </Modal>
  );
}
