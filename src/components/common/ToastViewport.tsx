import { useToast } from "../../context/ToastContext";

export function ToastViewport(): JSX.Element {
  const { toasts, dismissToast } = useToast();
  if (!toasts.length) return <></>;
  return (
    <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, width: "calc(100% - 32px)" }}>
      {toasts.map((t) => (
        <div key={t.id} className="toast" onClick={() => dismissToast(t.id)} style={{ cursor: "pointer" }}>
          <strong>{t.title}</strong>
          {t.body && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.body}</div>}
        </div>
      ))}
    </div>
  );
}
