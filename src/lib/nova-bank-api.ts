/** Nova Online Bank member API — HTTPS allowlist and same-origin /nova-api proxy only. */

const env = (import.meta as unknown as { env?: Record<string, string> }).env;

export const NOVA_BANK_API_ORIGIN = "https://nova-bank-api-production-7311.up.railway.app";
export const NOVA_BANK_PROTOCOL = "101.1";

export const ALLOWED_NOVA_BANK_HOSTS = new Set([
  "nova-bank-api-production-7311.up.railway.app",
  "api.nova-x.io",
  "www.nova-x.io",
]);

const DIRECT_ORIGIN_HOSTS = new Set(["novabank.uk", "www.novabank.uk"]);

export function isAllowedNovaBankUrl(url: string): URL | null {
  try {
    if (url.startsWith("/")) {
      if (!url.startsWith("/nova-api/v1")) return null;
      const origin = typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:5199";
      return new URL(url, origin);
    }
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/nova-api/v1")) {
      if (typeof window !== "undefined" && parsed.origin === window.location.origin) return parsed;
      const local = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (typeof window === "undefined" && local && (parsed.protocol === "http:" || parsed.protocol === "https:")) return parsed;
    }
    if (parsed.protocol !== "https:" || !ALLOWED_NOVA_BANK_HOSTS.has(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function envApiBase(): string | null {
  const raw = env?.VITE_NOVA_BANK_API_URL?.replace(/\/$/, "")?.trim();
  if (!raw) return null;
  return isAllowedNovaBankUrl(raw) ? raw : null;
}

export function novaBankApiBases(): string[] {
  const bases: string[] = [];
  const fromEnv = envApiBase();
  if (fromEnv) bases.push(fromEnv);
  const onNovaBank = typeof window !== "undefined" && DIRECT_ORIGIN_HOSTS.has(window.location.hostname);
  if (onNovaBank) bases.push(`${NOVA_BANK_API_ORIGIN}/api/v1`);
  if (typeof window !== "undefined") bases.push(`${window.location.origin}/nova-api/v1`);
  if (!onNovaBank) bases.push(`${NOVA_BANK_API_ORIGIN}/api/v1`);
  bases.push("https://api.nova-x.io/api/v1");
  bases.push("https://www.nova-x.io/api/v1");
  return [...new Set(bases)];
}

let resolvedBase: string | null = null;
let resolveInflight: Promise<string | null> | null = null;

function isFineractBank(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const provider = (body as { integrations?: { banking?: { provider?: unknown } } }).integrations?.banking?.provider;
  return provider === "fineract";
}

export async function resolveNovaBankApiBase(): Promise<string | null> {
  if (resolvedBase) return resolvedBase;
  if (resolveInflight) return resolveInflight;
  resolveInflight = (async () => {
    for (const base of novaBankApiBases()) {
      const probe = `${base}/health`;
      if (!isAllowedNovaBankUrl(probe)) continue;
      const body = await novaBankGetJson(probe);
      if (isFineractBank(body)) {
        resolvedBase = base;
        return base;
      }
    }
    return null;
  })();
  try {
    return await resolveInflight;
  } finally {
    resolveInflight = null;
  }
}

export function resetNovaBankApiBase(): void {
  resolvedBase = null;
}

export async function novaBankGetJson(url: string, token?: string | null): Promise<unknown | null> {
  const parsed = isAllowedNovaBankUrl(url);
  if (!parsed) return null;
  try {
    const headers: Record<string, string> = { Accept: "application/json", "X-Nova-Protocol": NOVA_BANK_PROTOCOL };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(parsed.toString(), { method: "GET", headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function novaBankSendJson(
  url: string,
  method: "POST" | "PATCH",
  body: unknown,
  opts?: { token?: string | null; idempotencyKey?: string },
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const parsed = isAllowedNovaBankUrl(url);
  if (!parsed) return { ok: false, status: 0, body: { message: "Blocked API host" } };
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Nova-Protocol": NOVA_BANK_PROTOCOL,
    };
    if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;
    if (opts?.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
    const res = await fetch(parsed.toString(), { method, headers, body: JSON.stringify(body) });
    const json = res.status === 204 ? {} : await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, body: json };
  } catch {
    return { ok: false, status: 0, body: { message: "Network error" } };
  }
}

export function novaBankMessage(body: unknown, fallback = "Request failed"): string {
  if (!body || typeof body !== "object") return fallback;
  const msg = (body as { message?: unknown }).message;
  if (typeof msg === "string" && msg.trim()) return msg;
  if (Array.isArray(msg)) return msg.map(String).join(" ");
  return fallback;
}

export function novaBankList<T>(body: unknown, key: string): T[] {
  if (Array.isArray(body)) return body as T[];
  if (!body || typeof body !== "object") return [];
  const rec = body as Record<string, unknown>;
  if (Array.isArray(rec[key])) return rec[key] as T[];
  if (Array.isArray(rec.data)) return rec.data as T[];
  if (Array.isArray(rec.items)) return rec.items as T[];
  return [];
}

export type NovaBankAccount = {
  id: string;
  accountNumber: string;
  currency: string;
  type: string;
  name: string;
  balance: string;
  available: string;
};

export type NovaBankUser = {
  id: string;
  email: string;
  fullName: string;
};

export type NovaBankSession = {
  accessToken: string;
  refreshToken: string;
  user: NovaBankUser;
  accounts: NovaBankAccount[];
};

export type NovaBankTransfer = {
  id: string;
  amount: string;
  amountOut?: string;
  currency: string;
  toCurrency?: string;
  reference?: string;
  createdAt: string;
  kind: string;
  toAccountNumber?: string;
};

export type NovaBankCard = {
  id: string;
  last4: string;
  masked: string;
  currency: string;
  status: string;
  virtual: boolean;
};

export function newIdempotencyKey(prefix: string): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${rand}`;
}
