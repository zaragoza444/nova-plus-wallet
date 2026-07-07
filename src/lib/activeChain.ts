// Signet — persisted active chain (UI context for send/swap/receive).
const KEY = "signet.activeChain.v1";
const CHANGE_EVENT = "signet:active-chain-changed";

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function notifyActiveChainChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribeActiveChainChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function getStoredActiveChainId(): number | null {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(KEY);
    if (!raw) return null;
    const id = Number(JSON.parse(raw));
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setStoredActiveChainId(chainId: number): void {
  const s = storage();
  if (!s) return;
  s.setItem(KEY, JSON.stringify(chainId));
  notifyActiveChainChanged();
}

export function clearStoredActiveChainId(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(KEY);
  notifyActiveChainChanged();
}
