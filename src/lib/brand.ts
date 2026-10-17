import { brandAssets } from "./brand.generated";

export const brand = brandAssets;

export function brandLogoUrl(preferWordmark = false): string | null {
  if (preferWordmark && brand.wordmarkUrl) return brand.wordmarkUrl;
  return brand.logoUrl ?? brand.markUrl ?? brand.wordmarkUrl;
}

export function brandMarkUrl(): string | null {
  return brand.markUrl ?? brand.logoUrl;
}

export function brandTagline(): string {
  return brand.tagline ?? "Self-custody wallet for Nova Bank and the Nova mesh";
}

export function brandProductName(): string {
  return brand.productName ?? "Nova+";
}

/** Public contact for Nova X, Nova+, Nova Bridge, and Nova Swap. */
export const NOVA_PRODUCT_CONTACT_EMAIL = "info@novatrust.uk";
