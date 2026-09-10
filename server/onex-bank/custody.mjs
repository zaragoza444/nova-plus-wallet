import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { masterSecret } from "./store.mjs";
import { firstLiveRpc, rpcCall } from "./chain.mjs";

function aesKey() {
  return scryptSync(masterSecret(), "onex-custody-v1", 32);
}

export function encryptSecret(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(blob) {
  const [ivHex, tagHex, dataHex] = String(blob).split(":");
  const decipher = createDecipheriv("aes-256-gcm", aesKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}

export async function createMemberWallet() {
  const { Wallet } = await import("ethers");
  const wallet = Wallet.createRandom();
  return {
    address: wallet.address,
    encryptedKey: encryptSecret(wallet.privateKey),
  };
}

export async function loadMemberWallet(encryptedKey) {
  const { Wallet } = await import("ethers");
  return new Wallet(decryptSecret(encryptedKey));
}

export async function readOnChainEth(address) {
  const live = await firstLiveRpc();
  if (!live.connected) return { connected: false, wei: 0n, rpcUrl: live.url };
  const hex = await rpcCall("eth_getBalance", [address, "latest"], live.url);
  return { connected: true, wei: BigInt(hex), rpcUrl: live.url, blockNumber: live.blockNumber };
}

export async function sendOnChainEth(encryptedKey, to, wei) {
  const { JsonRpcProvider } = await import("ethers");
  const live = await firstLiveRpc();
  if (!live.connected) throw new Error("OneX RPC is not connected");
  const wallet = await loadMemberWallet(encryptedKey);
  const provider = new JsonRpcProvider(live.url, 138);
  const signer = wallet.connect(provider);
  const tx = await signer.sendTransaction({ to, value: wei, chainId: 138 });
  return { txId: tx.hash, rpcUrl: live.url };
}
