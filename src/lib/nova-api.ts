/** Production Nova Bank API bases. HTTPS + host allowlist only (no user-controlled URLs). */

const env = (import.meta as unknown as { env?: Record<string, string> }).env;

export const ALLOWED_NOVA_API_HOSTS = new Set([
  "novabank.uk",
  "www.novabank.uk",
  "api.nova-x.io",
  "www.nova-x.io",
]);

try {
  const extra = env?.VITE_NOVA_API_URL?.trim();
  if (extra) ALLOWED_NOVA_API_HOSTS.add(new URL(extra).hostname);
} catch {
  /* keep defaults */
}

const SAME_ORIGIN_HOSTS = new Set([
  "novabank.uk",
  "www.novabank.uk",
  "api.nova-x.io",
  "www.nova-x.io",
]);

export function isAllowedNovaApiUrl(url: string): URL | null {
  try {
    if (url.startsWith("/") && typeof window !== "undefined") {
      const host = window.location.hostname;
      if (!SAME_ORIGIN_HOSTS.has(host) || !url.startsWith("/api/v1")) return null;
      return new URL(url, window.location.origin);
    }
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !ALLOWED_NOVA_API_HOSTS.has(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function envApiBase(): string | null {
  const raw = env?.VITE_NOVA_API_URL?.replace(/\/$/, "")?.trim();
  if (!raw) return null;
  return isAllowedNovaApiUrl(raw) ? raw : null;
}

export function novaApiBases(): string[] {
  const bases: string[] = [];
  const fromEnv = envApiBase();
  if (fromEnv) bases.push(fromEnv);
  if (typeof window !== "undefined" && SAME_ORIGIN_HOSTS.has(window.location.hostname)) {
    bases.push(`${window.location.origin}/api/v1`);
  }
  bases.push("https://api.nova-x.io/api/v1");
  bases.push("https://www.nova-x.io/api/v1");
  bases.push("https://novabank.uk/api/v1");
  return [...new Set(bases)];
}

let resolvedBase: string | null = null;
let resolveInflight: Promise<string | null> | null = null;

export async function novaGetJson(url: string): Promise<unknown | null> {
  const parsed = isAllowedNovaApiUrl(url);
  if (!parsed) return null;
  try {
    const res = await fetch(parsed.toString(), { method: "GET" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function novaPostJson(url: string, body: unknown): Promise<unknown | null> {
  const parsed = isAllowedNovaApiUrl(url);
  if (!parsed) return null;
  try {
    const res = await fetch(parsed.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export type NovaBridgeOutbound = {
  sourceChain: "nova-one" | "nrw-world";
  sourceChainId: number;
  destChainId: number;
  nonce: string;
  token: string;
  sender: string;
  recipient: string;
  amount: string;
  destChainIdRecorded: number;
  released: boolean;
};

export function novaBridgeChainSlug(chainId: number): "nova-one" | "nrw-world" | null {
  if (chainId === 22016) return "nova-one";
  if (chainId === 33001) return "nrw-world";
  return null;
}

export async function fetchNovaBridgeOutbound(
  sourceChainId: number,
  nonce: string,
): Promise<NovaBridgeOutbound | null> {
  const slug = novaBridgeChainSlug(sourceChainId);
  if (!slug || !/^\d+$/.test(nonce)) return null;
  const base = await resolveNovaApiBase();
  if (!base) return null;
  const body = await novaGetJson(`${base}/chains/bridge/outbound/${slug}/${nonce}`);
  if (!body || typeof body !== "object") return null;
  const rec = body as Partial<NovaBridgeOutbound>;
  if (typeof rec.nonce !== "string" || typeof rec.released !== "boolean") return null;
  return rec as NovaBridgeOutbound;
}

/** First API base that answers GET /chains/nova-one with production live status. */
export async function resolveNovaApiBase(): Promise<string | null> {
  if (resolvedBase) return resolvedBase;
  if (resolveInflight) return resolveInflight;
  resolveInflight = (async () => {
    for (const base of novaApiBases()) {
      const probe = `${base}/chains/nova-one`;
      if (!isAllowedNovaApiUrl(probe)) continue;
      const body = await novaGetJson(probe);
      if (body && typeof body === "object") {
        resolvedBase = base;
        return base;
      }
    }
    const fallback = novaApiBases()[0] ?? null;
    resolvedBase = fallback;
    return fallback;
  })();
  try {
    return await resolveInflight;
  } finally {
    resolveInflight = null;
  }
}
