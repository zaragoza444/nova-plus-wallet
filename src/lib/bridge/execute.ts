import {
  Contract,
  Interface,
  getAddress,
  isAddress,
  parseUnits,
  zeroPadValue,
  type TransactionReceipt,
} from "ethers";
import { getChain } from "../chains";
import { connectActiveWallet, txExplorerUrl } from "../transfer";
import {
  BRIDGE_HUB_ABI,
  BRIDGE_SPOKE_ABI,
  BRIDGE_VAULT_ABI,
  ERC20_APPROVE_ABI,
} from "./abis";
import { BRIDGE_VAULT_CHAIN_ID } from "./constants";
import { externalChainSlug, type BridgePathKind } from "./routes";
import type { BridgeToken } from "./tokens";

export interface BridgeExecuteParams {
  pathKind: BridgePathKind;
  fromChainId: number;
  toChainId: number;
  token: BridgeToken;
  amountText: string;
  recipient: string;
  balanceWei: bigint;
}

export interface BridgePreview {
  pathKind: BridgePathKind;
  pathLabel: string;
  fromChainName: string;
  toChainName: string;
  tokenSymbol: string;
  amountFormatted: string;
  amountWei: bigint;
  recipient: string;
  portalAddress: string;
  warnings: string[];
}

export type BridgeExecuteResult =
  | {
      ok: true;
      hash: string;
      explorerUrl: string | null;
      bridgeNonce?: string;
      pendingRelayer: boolean;
    }
  | { ok: false; message: string };

function recipientBytes32(addr: string): string {
  return zeroPadValue(getAddress(addr), 32);
}

export function validateBridgeInput(
  params: BridgeExecuteParams,
  pathLabel: string,
): { ok: true; preview: BridgePreview } | { ok: false; message: string } {
  const fromChain = getChain(params.fromChainId);
  if (!fromChain?.bridge?.address) {
    return { ok: false, message: "Bridge portal not configured on source network." };
  }
  const toChain = getChain(params.toChainId);
  if (!toChain) return { ok: false, message: "Unknown destination network." };

  if (!isAddress(params.recipient)) {
    return { ok: false, message: "Enter a valid destination address." };
  }

  let amountWei: bigint;
  try {
    amountWei = parseUnits(params.amountText.trim(), params.token.decimals);
  } catch {
    return { ok: false, message: "Invalid amount." };
  }
  if (amountWei <= 0n) return { ok: false, message: "Amount must be greater than zero." };
  if (amountWei > params.balanceWei) {
    return { ok: false, message: "Amount exceeds available balance." };
  }

  const warnings: string[] = [];
  if (params.pathKind !== "vault_outbound") {
    warnings.push(
      "Destination credit is relayed by mesh validators after your source transaction confirms. Track status in Bridge history.",
    );
  } else {
    warnings.push(
      "Vault outbound requires validator quorum before tokens release on the destination chain.",
    );
  }

  return {
    ok: true,
    preview: {
      pathKind: params.pathKind,
      pathLabel,
      fromChainName: fromChain.name,
      toChainName: toChain.name,
      tokenSymbol: params.token.symbol,
      amountFormatted: params.amountText.trim(),
      amountWei,
      recipient: getAddress(params.recipient),
      portalAddress: fromChain.bridge.address,
      warnings,
    },
  };
}

async function ensureAllowance(
  wallet: ReturnType<typeof connectActiveWallet>,
  tokenAddress: string,
  spender: string,
  amountWei: bigint,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const erc20 = new Contract(tokenAddress, [...ERC20_APPROVE_ABI], wallet);
  const current = (await erc20.allowance(wallet.address, spender)) as bigint;
  if (current >= amountWei) return { ok: true };

  try {
    const tx = await erc20.approve(spender, amountWei);
    await tx.wait();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error).message || "Token approval failed." };
  }
}

function parseNonceFromReceipt(
  receipt: TransactionReceipt,
  portalAddress: string,
  pathKind: BridgePathKind,
): string | undefined {
  const portal = getAddress(portalAddress);
  const hubIface = new Interface([...BRIDGE_HUB_ABI]);
  const spokeIface = new Interface([...BRIDGE_SPOKE_ABI]);
  const vaultIface = new Interface([...BRIDGE_VAULT_ABI]);

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== portal) continue;
    try {
      if (pathKind === "hub_lock_mint") {
        const parsed = hubIface.parseLog(log);
        if (parsed?.name === "Locked") return String(parsed.args.nonce);
      }
      if (pathKind === "spoke_burn_release") {
        const parsed = spokeIface.parseLog(log);
        if (parsed?.name === "Burned") return String(parsed.args.nonce);
      }
      if (pathKind === "vault_outbound") {
        const parsed = vaultIface.parseLog(log);
        if (parsed?.name === "BridgeRequestCreated") return String(parsed.args.nonce);
      }
    } catch {
      /* not our event */
    }
  }
  return undefined;
}

export async function executeBridge(params: BridgeExecuteParams): Promise<BridgeExecuteResult> {
  const fromChain = getChain(params.fromChainId);
  if (!fromChain?.bridge?.address) {
    return { ok: false, message: "Bridge portal not configured." };
  }
  const toChain = getChain(params.toChainId);
  if (!toChain) return { ok: false, message: "Unknown destination." };

  let amountWei: bigint;
  try {
    amountWei = parseUnits(params.amountText.trim(), params.token.decimals);
  } catch {
    return { ok: false, message: "Invalid amount." };
  }

  const wallet = connectActiveWallet(params.fromChainId);
  const portal = fromChain.bridge.address;
  const recipient = getAddress(params.recipient);

  try {
    if (params.pathKind === "hub_lock_mint") {
      const allowance = await ensureAllowance(wallet, params.token.address, portal, amountWei);
      if (!allowance.ok) return allowance;

      const hub = new Contract(portal, [...BRIDGE_HUB_ABI], wallet);
      const paused = (await hub.lockPaused(params.toChainId)) as boolean;
      if (paused) return { ok: false, message: "Hub lock to this destination is paused." };

      const tx = await hub.lock(amountWei, params.toChainId, recipientBytes32(recipient));
      const receipt = (await tx.wait()) as TransactionReceipt;
      const hash = receipt.hash;
      return {
        ok: true,
        hash,
        explorerUrl: txExplorerUrl(fromChain, hash),
        bridgeNonce: parseNonceFromReceipt(receipt, portal, params.pathKind),
        pendingRelayer: true,
      };
    }

    if (params.pathKind === "spoke_burn_release") {
      const spoke = new Contract(portal, [...BRIDGE_SPOKE_ABI], wallet);
      const paused = (await spoke.paused()) as boolean;
      if (paused) return { ok: false, message: "Spoke bridge is paused." };

      const tx = await spoke.burnAndSend(amountWei, recipientBytes32(recipient));
      const receipt = (await tx.wait()) as TransactionReceipt;
      const hash = receipt.hash;
      return {
        ok: true,
        hash,
        explorerUrl: txExplorerUrl(fromChain, hash),
        bridgeNonce: parseNonceFromReceipt(receipt, portal, params.pathKind),
        pendingRelayer: true,
      };
    }

    if (params.pathKind === "vault_outbound") {
      const allowance = await ensureAllowance(wallet, params.token.address, portal, amountWei);
      if (!allowance.ok) return allowance;

      const vault = new Contract(portal, [...BRIDGE_VAULT_ABI], wallet);
      const paused = (await vault.bridgePaused()) as boolean;
      if (paused) return { ok: false, message: "AnakaChain Bridge vault is paused." };

      const tx = await vault.createOutboundRequest(
        params.token.address,
        externalChainSlug(toChain),
        recipient,
        amountWei,
      );
      const receipt = (await tx.wait()) as TransactionReceipt;
      const hash = receipt.hash;
      return {
        ok: true,
        hash,
        explorerUrl: txExplorerUrl(fromChain, hash),
        bridgeNonce: parseNonceFromReceipt(receipt, portal, params.pathKind),
        pendingRelayer: false,
      };
    }

    return { ok: false, message: "Unsupported bridge path." };
  } catch (e) {
    return { ok: false, message: (e as Error).message || "Bridge transaction failed." };
  }
}

export async function readBridgeTokenBalance(
  chainId: number,
  token: BridgeToken,
  owner: string,
): Promise<bigint> {
  const wallet = connectActiveWallet(chainId);
  const erc20 = new Contract(token.address, [...ERC20_APPROVE_ABI], wallet);
  return (await erc20.balanceOf(owner)) as bigint;
}

export async function refreshVaultRequestStatus(
  nonce: string,
): Promise<{ status: "pending_validation" | "executed" | "rejected" | "failed"; detail: string } | null> {
  const chain = getChain(BRIDGE_VAULT_CHAIN_ID);
  if (!chain?.bridge?.address) return null;
  try {
    const wallet = connectActiveWallet(BRIDGE_VAULT_CHAIN_ID);
    const vault = new Contract(chain.bridge.address, [...BRIDGE_VAULT_ABI], wallet);
    const req = await vault.getRequest(BigInt(nonce));
    const statusNum = Number(req.status);
    if (statusNum === 2) return { status: "executed", detail: "Validators executed vault release." };
    if (statusNum === 3) return { status: "rejected", detail: "Vault request was rejected." };
    if (statusNum === 4) return { status: "failed", detail: "Vault request expired." };
    return {
      status: "pending_validation",
      detail: `Awaiting validator quorum (${String(req.validationCount)} confirmations).`,
    };
  } catch {
    return null;
  }
}
