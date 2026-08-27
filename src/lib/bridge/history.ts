import { getChain } from "../chains";
import { refreshNovaGatewayStatus, refreshVaultRequestStatus } from "./execute";
import { BRIDGE_VAULT_CHAIN_ID } from "./constants";
import type { BridgePathKind } from "./routes";

const BRIDGE_KEY = "signet.bridge.v1";
const BRIDGE_CHANGE_EVENT = "signet:bridge-changed";
const MAX_RECORDS = 100;

export function notifyBridgeChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BRIDGE_CHANGE_EVENT));
  }
}

export type BridgeRecordStatus =
  | "submitted"
  | "pending_relayer"
  | "pending_validation"
  | "executed"
  | "rejected"
  | "failed";

export interface BridgeRecord {
  id: string;
  pathKind: BridgePathKind;
  pathLabel: string;
  fromChainId: number;
  fromChainName: string;
  toChainId: number;
  toChainName: string;
  tokenSymbol: string;
  amount: string;
  recipient: string;
  portalAddress: string;
  sourceTxHash: string;
  sourceExplorerUrl: string | null;
  bridgeNonce?: string;
  status: BridgeRecordStatus;
  statusDetail: string;
  timestamp: number;
  updatedAt: number;
}

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function getBridgeRecords(): BridgeRecord[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(BRIDGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BridgeRecord[]) : [];
  } catch {
    return [];
  }
}

function persist(records: BridgeRecord[]): void {
  const s = storage();
  if (s) s.setItem(BRIDGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  notifyBridgeChanged();
}

export function appendBridgeRecord(
  input: Omit<BridgeRecord, "id" | "timestamp" | "updatedAt">,
): BridgeRecord {
  const entry: BridgeRecord = {
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    updatedAt: Date.now(),
  };
  persist([entry, ...getBridgeRecords()]);
  return entry;
}

export function updateBridgeRecord(id: string, patch: Partial<Pick<BridgeRecord, "status" | "statusDetail">>): void {
  const next = getBridgeRecords().map((r) =>
    r.id === id ? { ...r, ...patch, updatedAt: Date.now() } : r,
  );
  persist(next);
}

export async function pollBridgeRecordStatuses(): Promise<void> {
  const records = getBridgeRecords();
  let changed = false;
  const next = await Promise.all(
    records.map(async (r) => {
      if (r.status === "executed" || r.status === "rejected" || r.status === "failed") return r;
      if (!r.bridgeNonce) return r;

      if (r.pathKind === "nova_lock_release") {
        const fresh = await refreshNovaGatewayStatus(r.fromChainId, r.bridgeNonce);
        if (!fresh || (fresh.status === r.status && fresh.detail === r.statusDetail)) return r;
        changed = true;
        return { ...r, status: fresh.status, statusDetail: fresh.detail, updatedAt: Date.now() };
      }

      if (r.pathKind !== "vault_outbound" || r.fromChainId !== BRIDGE_VAULT_CHAIN_ID) return r;
      const fresh = await refreshVaultRequestStatus(r.bridgeNonce);
      if (!fresh || (fresh.status === r.status && fresh.detail === r.statusDetail)) return r;
      changed = true;
      return { ...r, status: fresh.status, statusDetail: fresh.detail, updatedAt: Date.now() };
    }),
  );
  if (changed) persist(next);
}

export function statusLabel(status: BridgeRecordStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "pending_relayer":
      return "Awaiting relayer";
    case "pending_validation":
      return "Pending validation";
    case "executed":
      return "Complete";
    case "rejected":
      return "Rejected";
    case "failed":
      return "Failed";
  }
}

export function statusTone(status: BridgeRecordStatus): "neutral" | "success" | "error" | "pending" {
  if (status === "executed") return "success";
  if (status === "rejected" || status === "failed") return "error";
  if (status === "pending_relayer" || status === "pending_validation" || status === "submitted") {
    return "pending";
  }
  return "neutral";
}

export function portalLabel(chainId: number): string {
  const chain = getChain(chainId);
  const addr = chain?.bridge?.address;
  if (!addr) return "—";
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}
