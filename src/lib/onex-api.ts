/** OneX Online Bank API — HTTPS/localhost allowlist only (no user-controlled URLs). */

const env = (import.meta as unknown as { env?: Record<string, string> }).env;

export const ONEX_CHAIN_ID = 138;

export const ALLOWED_ONEX_API_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "novabank.uk",
  "www.novabank.uk",
  "nova-bank-api-production-7311.up.railway.app",
]);

try {
  const extra = env?.VITE_ONEX_API_URL?.trim();
  if (extra) ALLOWED_ONEX_API_HOSTS.add(new URL(extra).hostname);
} catch {
  /* keep defaults */
}

export function isAllowedOnexApiUrl(url: string): URL | null {
  try {
    if (url.startsWith("/")) {
      if (!url.startsWith("/api/v1") && !url.startsWith("/onex-rpc")) return null;
      const origin = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:8090";
      return new URL(url, origin);
    }
    const parsed = new URL(url);
    const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (local && (parsed.protocol === "http:" || parsed.protocol === "https:")) return parsed;
    if (parsed.protocol !== "https:" || !ALLOWED_ONEX_API_HOSTS.has(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function envApiBase(): string | null {
  const raw = env?.VITE_ONEX_API_URL?.replace(/\/$/, "")?.trim();
  if (!raw) return null;
  return isAllowedOnexApiUrl(raw) ? raw : null;
}

export function onexApiBases(): string[] {
  const bases: string[] = [];
  const fromEnv = envApiBase();
  if (fromEnv) bases.push(fromEnv);
  if (typeof window !== "undefined") {
    bases.push(`${window.location.origin}/api/v1`);
  }
  bases.push("http://127.0.0.1:8090/api/v1");
  return [...new Set(bases)];
}

let resolvedBase: string | null = null;
let resolveInflight: Promise<string | null> | null = null;

export async function resolveOnexApiBase(): Promise<string | null> {
  if (resolvedBase) return resolvedBase;
  if (resolveInflight) return resolveInflight;
  resolveInflight = (async () => {
    for (const base of onexApiBases()) {
      const probe = `${base}/health`;
      if (!isAllowedOnexApiUrl(probe)) continue;
      const body = await onexGetJson(probe);
      if (body && typeof body === "object" && (body as { status?: string }).status === "ok") {
        resolvedBase = base;
        return base;
      }
    }
    const fallback = onexApiBases()[0] ?? null;
    resolvedBase = fallback;
    return fallback;
  })();
  try {
    return await resolveInflight;
  } finally {
    resolveInflight = null;
  }
}

export async function onexGetJson(url: string, token?: string | null): Promise<unknown | null> {
  const parsed = isAllowedOnexApiUrl(url);
  if (!parsed) return null;
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(parsed.toString(), { method: "GET", headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function onexSendJson(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
  opts?: { token?: string | null; idempotencyKey?: string },
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const parsed = isAllowedOnexApiUrl(url);
  if (!parsed) return { ok: false, status: 0, body: { message: "Blocked API host" } };
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", "X-Onex-Protocol": "1" };
    if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
    const res = await fetch(parsed.toString(), { method, headers, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body: json };
  } catch {
    return { ok: false, status: 0, body: { message: "Network error" } };
  }
}

export function apiMessage(body: unknown, fallback = "Request failed"): string {
  if (!body || typeof body !== "object") return fallback;
  const msg = (body as { message?: unknown }).message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg)) return msg.map(String).join(" ");
  return fallback;
}

export type OnexAccount = {
  id: string;
  accountNumber: string;
  currency: string;
  type: string;
  name: string;
  balance: string;
  available: string;
  chainId?: number | null;
};

export type OnexSession = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string };
  accounts: OnexAccount[];
};

export type OnexTransfer = {
  id: string;
  amount: string;
  amountOut?: string;
  currency: string;
  toCurrency?: string;
  reference?: string;
  createdAt: string;
  kind: string;
  toAccountNumber?: string;
  txId?: string;
};

export type OnexCard = {
  id: string;
  last4: string;
  masked: string;
  currency: string;
  status: string;
  virtual: boolean;
};

export type OnexBankStatus = {
  enabled: boolean;
  connected: boolean;
  mode: string;
  network: string;
};

export function resetOnexApiBase(): void {
  resolvedBase = null;
}
