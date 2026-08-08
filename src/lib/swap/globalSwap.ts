/** Deep-link into @nova/swap Global Swap for Nova / ALLTRA trade. */

const DEFAULT_GLOBAL_SWAP =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GLOBAL_SWAP_URL ??
  "/signet/?tab=alltra";

/** Mesh / ALLTRA / Nova chains that use Global Swap instead of 1inch. */
export const GLOBAL_SWAP_CHAIN_IDS = new Set([
  138, // Defi Oracle Meta
  651940, // ALLTRA
  11011, 11012, 11013, 11014, 11015, // Anaka mesh
  22016, // NovaONE
  9001, // Nova Production
  33001, // NRW World
  44001, // Victoria
]);

export function usesGlobalSwap(chainId: number): boolean {
  return GLOBAL_SWAP_CHAIN_IDS.has(chainId);
}

export function globalSwapUrl(opts?: { tab?: string; symbol?: string }): string {
  const base = DEFAULT_GLOBAL_SWAP;
  try {
    const url = new URL(base, typeof window !== "undefined" ? window.location.origin : "https://novabank.uk");
    url.searchParams.set("tab", opts?.tab ?? "alltra");
    if (opts?.symbol) url.searchParams.set("token", opts.symbol);
    // Prefer path+query when same-origin relative
    if (base.startsWith("/")) {
      return `${url.pathname}${url.search}`;
    }
    return url.toString();
  } catch {
    return base.includes("?") ? base : `${base}?tab=alltra`;
  }
}
