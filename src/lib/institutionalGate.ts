/**
 * Institutional gate — CLIENT-SIDE session flag only.
 *
 * SECURITY: This compares the user input against a SHA-256 hash from
 * `VITE_INSTITUTIONAL_GATE`. It is NOT real protection — replace with
 * server-side verification before production institutional deployments.
 */
const CHANGE_EVENT = "signet:institutional-gate-changed";

let gateUnlocked = false;

export function notifyInstitutionalGateChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
}

export function subscribeInstitutionalGateChanged(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, fn);
  return () => window.removeEventListener(CHANGE_EVENT, fn);
}

export function isInstitutionalGateUnlocked(): boolean {
  return gateUnlocked;
}

export function setInstitutionalGateUnlocked(unlocked: boolean): void {
  gateUnlocked = unlocked;
  notifyInstitutionalGateChanged();
}

export function clearInstitutionalGate(): void {
  gateUnlocked = false;
  notifyInstitutionalGateChanged();
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function expectedGateHash(): string | null {
  const raw = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_INSTITUTIONAL_GATE;
  const trimmed = raw?.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

export function isInstitutionalGateConfigured(): boolean {
  return !!expectedGateHash();
}

/** Verify gate value against env hash; throws if misconfigured or wrong. */
export async function verifyInstitutionalGate(input: string): Promise<void> {
  const expected = expectedGateHash();
  if (!expected) {
    throw new Error(
      "Institutional gate is not configured. Set VITE_INSTITUTIONAL_GATE (SHA-256 hex) in .env.local.",
    );
  }
  const actual = (await sha256Hex(input.trim())).toLowerCase();
  if (actual !== expected) {
    throw new Error("Incorrect institutional gate.");
  }
  setInstitutionalGateUnlocked(true);
}

/** @deprecated Use institutional gate naming in new code. */
export const isPrivateUnlocked = isInstitutionalGateUnlocked;
export const clearPrivateSession = clearInstitutionalGate;
export const subscribePrivateAccessChanged = subscribeInstitutionalGateChanged;
