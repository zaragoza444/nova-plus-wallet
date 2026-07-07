import { useEffect, useId, useRef, type ReactNode } from "react";

export function DropdownPanel({
  open,
  onClose,
  trigger,
  children,
  align = "right",
  widthClass = "w-72",
}: {
  open: boolean;
  onClose: () => void;
  trigger: (props: { expanded: boolean; controlId: string }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  widthClass?: string;
}): JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const controlId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={panelRef}>
      {trigger({ expanded: open, controlId })}
      {open && (
        <div
          role="menu"
          aria-labelledby={controlId}
          className={`absolute top-[calc(100%+6px)] z-50 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-signet-border bg-signet-bg shadow-lg ${widthClass} ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
