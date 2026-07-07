// Signet — on-chain transfer helpers (ethers v6). Never log keys or mnemonics.
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatUnits,
  getAddress,
  isAddress,
  parseUnits,
  type TransactionRequest,
} from "ethers";
import { getActiveWallet } from "../context/WalletContext";
import type { ChainDef } from "./chains";
import { getAllChains } from "./networks";

const CONFIRM = "NEEDS_CONFIRM";
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
];

export interface TransferParams {
  chainId: number;
  tokenAddress?: string;
  decimals: number;
  symbol: string;
  to: string;
  amountText: string;
  balanceWei: string;
}

export interface FeeEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  feeWei: bigint;
  feeFormatted: string;
  nativeSymbol: string;
}

export interface TransferEstimate {
  recipient: string;
  amountFormatted: string;
  amountWei: bigint;
  fee: FeeEstimate;
  chain: ChainDef;
  isNative: boolean;
  warnings: string[];
}

export type TransferResult =
  | { ok: true; hash: string; explorerUrl: string | null; chainName: string }
  | { ok: false; message: string };

export function getChainForTransfer(chainId: number): ChainDef | undefined {
  return getAllChains().find((c) => c.id === chainId);
}

export function txExplorerUrl(chain: ChainDef, hash: string): string | null {
  const base = chain.blockExplorerUrls[0];
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/tx/${hash}`;
}

export function connectActiveWallet(chainId: number): Wallet {
  const wallet = getActiveWallet();
  if (!wallet) throw new Error("Wallet is locked. Unlock to continue.");
  const chain = getChainForTransfer(chainId);
  const rpc = chain?.rpcUrls[0];
  if (!chain || !rpc || rpc === CONFIRM) {
    throw new Error("Network RPC is not configured for this chain.");
  }
  const provider = new JsonRpcProvider(rpc, chainId);
  return wallet.connect(provider) as Wallet;
}

export function parseTransferAmount(
  to: string,
  amountText: string,
  decimals: number,
  balanceWei: bigint,
): { ok: true; amountWei: bigint; recipient: string } | { ok: false; message: string } {
  const raw = to.trim();
  if (!isAddress(raw)) {
    return { ok: false, message: "Recipient must be a valid 0x address." };
  }
  let recipient: string;
  try {
    recipient = getAddress(raw);
  } catch {
    return { ok: false, message: "Recipient must be a valid 0x address." };
  }
  if (recipient === "0x0000000000000000000000000000000000000000") {
    return { ok: false, message: "Cannot send to the zero address." };
  }

  let amountWei: bigint;
  try {
    amountWei = parseUnits(amountText.trim(), decimals);
  } catch {
    return { ok: false, message: "Enter a valid amount for this token's decimals." };
  }
  if (amountWei <= 0n) {
    return { ok: false, message: "Amount must be greater than zero." };
  }
  if (amountWei > balanceWei) {
    return { ok: false, message: "Amount exceeds your available balance." };
  }
  return { ok: true, amountWei, recipient };
}

async function buildTxRequest(
  signer: Wallet,
  recipient: string,
  amountWei: bigint,
  tokenAddress: string | undefined,
): Promise<TransactionRequest> {
  if (!tokenAddress) {
    return { to: recipient, value: amountWei };
  }
  const contract = new Contract(tokenAddress, ERC20_ABI, signer);
  return contract.transfer.populateTransaction(recipient, amountWei);
}

async function estimateFee(
  signer: Wallet,
  tx: TransactionRequest,
  chain: ChainDef,
): Promise<FeeEstimate> {
  const from = await signer.getAddress();
  const gasLimit = await signer.estimateGas({ ...tx, from });
  const feeData = await signer.provider!.getFeeData();
  const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
  const feeWei = gasLimit * gasPrice;
  const nc = chain.nativeCurrency;
  return {
    gasLimit,
    gasPrice,
    feeWei,
    feeFormatted: `${formatUnits(feeWei, nc.decimals)} ${nc.symbol}`,
    nativeSymbol: nc.symbol,
  };
}

export function userFacingTransferError(err: unknown): string {
  if (typeof err === "object" && err !== null) {
    const code = (err as { code?: string }).code;
    if (code === "ACTION_REJECTED" || code === 4001) {
      return "Transaction cancelled.";
    }
  }
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("insufficient funds")) {
    return "Insufficient balance to cover the transfer and network fee.";
  }
  if (lower.includes("network") || lower.includes("timeout") || lower.includes("fetch")) {
    return "Could not reach the network. Check your connection and try again.";
  }
  if (lower.includes("locked")) return "Wallet is locked. Unlock to continue.";
  if (lower.includes("rpc")) return "Network RPC is not available for this chain.";
  if (msg.length > 160) return `${msg.slice(0, 160)}…`;
  return msg || "Transaction failed.";
}

export async function estimateTransfer(
  params: TransferParams,
  senderAddress: string,
): Promise<{ ok: true; estimate: TransferEstimate } | { ok: false; message: string }> {
  const chain = getChainForTransfer(params.chainId);
  if (!chain) return { ok: false, message: "Unknown network." };

  const balanceWei = BigInt(params.balanceWei);
  const parsed = parseTransferAmount(params.to, params.amountText, params.decimals, balanceWei);
  if (!parsed.ok) return parsed;

  const isNative = !params.tokenAddress;
  const warnings: string[] = ["This transfer is irreversible once confirmed on-chain."];
  if (parsed.recipient.toLowerCase() === senderAddress.toLowerCase()) {
    warnings.push("You are sending to your own address.");
  }

  try {
    const signer = connectActiveWallet(params.chainId);
    const tx = await buildTxRequest(signer, parsed.recipient, parsed.amountWei, params.tokenAddress);
    const fee = await estimateFee(signer, tx, chain);

    const nativeBal = await signer.provider!.getBalance(senderAddress);
    if (nativeBal < fee.feeWei) {
      return { ok: false, message: `Insufficient ${fee.nativeSymbol} for the network fee.` };
    }
    if (isNative && parsed.amountWei + fee.feeWei > balanceWei) {
      return {
        ok: false,
        message: `Insufficient ${params.symbol} to cover amount plus network fee.`,
      };
    }

    return {
      ok: true,
      estimate: {
        recipient: parsed.recipient,
        amountFormatted: `${params.amountText.trim()} ${params.symbol}`,
        amountWei: parsed.amountWei,
        fee,
        chain,
        isNative,
        warnings,
      },
    };
  } catch (err) {
    return { ok: false, message: userFacingTransferError(err) };
  }
}

export async function executeTransfer(params: TransferParams): Promise<TransferResult> {
  const chain = getChainForTransfer(params.chainId);
  if (!chain) return { ok: false, message: "Unknown network." };

  const balanceWei = BigInt(params.balanceWei);
  const parsed = parseTransferAmount(params.to, params.amountText, params.decimals, balanceWei);
  if (!parsed.ok) return parsed;

  try {
    const signer = connectActiveWallet(params.chainId);
    const txReq = await buildTxRequest(signer, parsed.recipient, parsed.amountWei, params.tokenAddress);
    const tx = await signer.sendTransaction(txReq);
    const hash = tx.hash;
    return {
      ok: true,
      hash,
      explorerUrl: txExplorerUrl(chain, hash),
      chainName: chain.name,
    };
  } catch (err) {
    return { ok: false, message: userFacingTransferError(err) };
  }
}
