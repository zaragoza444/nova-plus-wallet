import { getAddress, isAddress } from "ethers";

/** Canonical Nova Plus Wallet owner (watch-only until the matching key is imported). */
export const NOVA_PLUS_WALLET_OWNER = getAddress(
  "0xac1204fa4fe378fc6a8f6239503f9fb0c844c9c0",
);

export function isNovaPlusWalletOwner(address: string | null | undefined): boolean {
  if (!address || !isAddress(address)) return false;
  return getAddress(address) === NOVA_PLUS_WALLET_OWNER;
}
