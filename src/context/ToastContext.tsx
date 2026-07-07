import React, { createContext, useContext, useState, useCallback } from "react";

interface Toast { id: string; title: string; body?: string; tone?: "info" | "success" | "error"; }

const ToastCtx = createContext<{
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}>({ toasts: [], pushToast: () => {}, dismissToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);
  return <ToastCtx.Provider value={{ toasts, pushToast, dismissToast }}>{children}</ToastCtx.Provider>;
}

export function useToast() {
  return useContext(ToastCtx);
}
