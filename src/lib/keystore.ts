// ─────────────────────────────────────────────────────────────────────────────
// Signet — keystore engine
// Real self-custody key handling with ethers v6.
//   • generate    → BIP39 mnemonic + key, created in-browser with secure entropy
//   • encrypt     → scrypt-encrypted keystore JSON (the private key, never plaintext)
//   • store       → encrypted blob in localStorage; only the address is kept in clear
//   • unlock      → decrypt with the user's password into an in-memory signer
// The mnemonic is shown once at creation and never persisted. Nothing leaves the device.
// ─────────────────────────────────────────────────────────────────────────────

import { Wallet, HDNodeWallet } from "ethers";

const VAULT_KEY = "signet.keystore.v1";
const META_KEY = "signet.meta.v1";
const PRIVATE_PROFILE_KEY = "signet.private.v1";

export type AccountType = "personal" | "institutional";

export interface BankConfig {
  id: string;
  name: string;
  /** null = link pending (NEEDS_CONFIRM) */
  url: string | null;
  initial: string;
}

export interface PrivateProfile {
  institutional: boolean;
  privateChains: number[];
  banks: BankConfig[];
}

export type AnyWallet = Wallet | HDNodeWallet;

export interface VaultMeta {
  address: string;
  createdAt: number;
  accountType: AccountType;
}

export const DEFAULT_BANKS: BankConfig[] = [
  { id: "onexbank", name: "OneX Bank Online", url: "/onex", initial: "X" },
  { id: "novabank", name: "NovaBank", url: "https://nova-bank-api-production-7311.up.railway.app/", initial: "N" },
  { id: "anakabank", name: "AnakaBank", url: null, initial: "A" },
  { id: "zbank", name: "Z Bank", url: null, initial: "Z" },
  { id: "omnl", name: "OMNL", url: null, initial: "O" },
];

export function createDefaultPrivateProfile(): PrivateProfile {
  return { institutional: true, privateChains: [], banks: [...DEFAULT_BANKS] };
}

/** True if an encrypted wallet already exists on this device. */
export function hasVault(): boolean {
  try {
    return !!localStorage.getItem(VAULT_KEY);
  } catch {
    return false;
  }
}

/** The stored address (safe to read while locked). null if no vault. */
export function getStoredAddress(): string | null {
  return getVaultMeta()?.address ?? null;
}

export function getAccountType(): AccountType {
  return getVaultMeta()?.accountType ?? "personal";
}

export function isInstitutionalAccount(): boolean {
  return getAccountType() === "institutional";
}

function getVaultMeta(): VaultMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VaultMeta>;
    if (!parsed.address) return null;
    return {
      address: parsed.address,
      createdAt: parsed.createdAt ?? Date.now(),
      accountType: parsed.accountType === "institutional" ? "institutional" : "personal",
    };
  } catch {
    return null;
  }
}

function writeVaultMeta(meta: VaultMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

/** Generate a brand-new wallet. NOT yet stored — caller must encryptAndStore it. */
export function createRandomWallet(): HDNodeWallet {
  return Wallet.createRandom();
}

/** Rebuild a wallet from a 12/24-word recovery phrase. Throws on invalid phrase. */
export function walletFromPhrase(phrase: string): HDNodeWallet {
  return Wallet.fromPhrase(phrase.trim().replace(/\s+/g, " "));
}

/** Rebuild a wallet from a raw private key. Throws on invalid key. */
export function walletFromPrivateKey(pk: string): Wallet {
  const key = pk.trim();
  return new Wallet(key.startsWith("0x") ? key : `0x${key}`);
}

/**
 * Best-effort detection of phrase vs private key, then build the wallet.
 * Used by the import screen so the user can paste either.
 */
export function walletFromSecret(secret: string): AnyWallet {
  const s = secret.trim();
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length >= 12) return walletFromPhrase(s);
  const hex = s.startsWith("0x") ? s.slice(2) : s;
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return walletFromPrivateKey(s);
  throw new Error("That doesn't look like a recovery phrase or a private key.");
}

/** Encrypt the wallet with the password and persist it. onProgress: 0..1 (scrypt is slow on purpose). */
export async function encryptAndStore(
  wallet: AnyWallet,
  password: string,
  onProgress?: (p: number) => void,
  accountType: AccountType = "personal",
): Promise<void> {
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  const json = await wallet.encrypt(password, onProgress);
  const meta: VaultMeta = { address: wallet.address, createdAt: Date.now(), accountType };
  localStorage.setItem(VAULT_KEY, json);
  writeVaultMeta(meta);
}

/** Decrypt the stored vault with the password. Throws if no vault or wrong password. */
export async function unlockVault(
  password: string,
  onProgress?: (p: number) => void,
): Promise<AnyWallet> {
  const json = localStorage.getItem(VAULT_KEY);
  if (!json) throw new Error("No wallet found on this device.");
  return Wallet.fromEncryptedJson(json, password, onProgress);
}

/** Re-encrypt the vault with a new password after verifying the current one. */
export async function changeVaultPassword(
  oldPassword: string,
  newPassword: string,
  onProgress?: (p: number) => void,
): Promise<AnyWallet> {
  const wallet = await unlockVault(oldPassword, onProgress);
  await encryptAndStore(wallet, newPassword, onProgress);
  return wallet;
}

export type RevealSecretResult =
  | { kind: "mnemonic"; phrase: string }
  | { kind: "no_mnemonic"; message: string };

/**
 * Verify password and return the recovery phrase when the wallet was created from one.
 * Never persists or logs the phrase.
 */
export async function revealMnemonicWithPassword(
  password: string,
  onProgress?: (p: number) => void,
): Promise<RevealSecretResult> {
  const wallet = await unlockVault(password, onProgress);
  const phrase = wallet instanceof HDNodeWallet ? wallet.mnemonic?.phrase?.trim() : undefined;
  if (phrase) return { kind: "mnemonic", phrase };
  return {
    kind: "no_mnemonic",
    message:
      "This wallet was imported from a private key. There is no recovery phrase — store the private key securely instead.",
  };
}

/** Permanently remove the wallet from this device. Irreversible without the recovery phrase. */
export function wipeVault(): void {
  localStorage.removeItem(VAULT_KEY);
  localStorage.removeItem(META_KEY);
  localStorage.removeItem(PRIVATE_PROFILE_KEY);
}

interface EncryptedBlob {
  v: 1;
  salt: string;
  iv: string;
  data: string;
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 120_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function encryptPrivateProfile(profile: PrivateProfile, password: string): Promise<void> {
  if (password.length < 8) throw new Error("Private Access password must be at least 8 characters.");
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, enc.encode(JSON.stringify(profile)));
  const blob: EncryptedBlob = { v: 1, salt: toHex(salt), iv: toHex(iv), data: toHex(new Uint8Array(cipher)) };
  localStorage.setItem(PRIVATE_PROFILE_KEY, JSON.stringify(blob));
}

export async function unlockPrivateProfile(password: string): Promise<PrivateProfile> {
  const raw = localStorage.getItem(PRIVATE_PROFILE_KEY);
  if (!raw) throw new Error("No private profile on this device.");
  const blob = JSON.parse(raw) as EncryptedBlob;
  if (blob.v !== 1) throw new Error("Unsupported private profile format.");
  const key = await deriveAesKey(password, fromHex(blob.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromHex(blob.iv) as BufferSource },
    key,
    fromHex(blob.data) as BufferSource,
  );
  const profile = JSON.parse(new TextDecoder().decode(plain)) as PrivateProfile;
  if (!profile || typeof profile.institutional !== "boolean") {
    throw new Error("Invalid private profile.");
  }
  return profile;
}

export function hasPrivateProfile(): boolean {
  try {
    return !!localStorage.getItem(PRIVATE_PROFILE_KEY);
  } catch {
    return false;
  }
}
