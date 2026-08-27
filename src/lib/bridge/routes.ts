import { getAllChains, type ChainDef } from "../networks";
import {
  BRIDGE_HUB_CHAIN_ID,
  BRIDGE_VAULT_CHAIN_ID,
  NOVA_MESH_BRIDGE_IDS,
  SUPER_BRIDGE_SPOKE_IDS,
} from "./constants";

const CONFIRM = "NEEDS_CONFIRM";

export type BridgePathKind =
  | "hub_lock_mint"
  | "spoke_burn_release"
  | "vault_outbound"
  | "nova_lock_release"
  | "catalog_lock";

export interface BridgeRoute {
  ok: true;
  pathKind: BridgePathKind;
  label: string;
  description: string;
  fromChain: ChainDef;
  toChain: ChainDef;
}

export interface BridgeRouteDisabled {
  ok: false;
  reason: string;
}

export type BridgeRouteResult = BridgeRoute | BridgeRouteDisabled;

const PUBLIC_BRIDGE_PICKER_IDS = [22016, 33001, 651940, 1, 56, 8453, 42161];

/** Chains that expose a registry `bridge.address` and are usable from the browser wallet. */
export function getBridgePortalChains(): ChainDef[] {
  return getAllChains().filter((c) => {
    if (!c.bridge?.address) return false;
    const rpc = c.rpcUrls[0];
    if (!rpc || rpc === CONFIRM) return false;
    if (c.isInternal && c.id !== BRIDGE_VAULT_CHAIN_ID) return false;
    return true;
  });
}

/** Portal chains plus public EVMs shown in the picker (Super Bridge / pending). */
export function getBridgePickerChains(): ChainDef[] {
  const portals = getBridgePortalChains();
  const extra = getAllChains().filter(
    (c) => PUBLIC_BRIDGE_PICKER_IDS.includes(c.id) && !portals.some((p) => p.id === c.id),
  );
  return [...portals, ...extra];
}

export function isBridgeChainReachable(chainId: number, enabledIds: number[]): boolean {
  const chain = getAllChains().find((c) => c.id === chainId);
  if (!chain?.bridge?.address) return false;
  const rpc = chain.rpcUrls[0];
  if (!rpc || rpc === CONFIRM) return false;
  if (chain.id === BRIDGE_VAULT_CHAIN_ID) return true;
  if (chain.isInternal) return false;
  return enabledIds.includes(chainId);
}

export function evaluateBridgeRoute(
  fromChainId: number,
  toChainId: number,
  enabledIds: number[],
): BridgeRouteResult {
  if (fromChainId === toChainId) {
    return { ok: false, reason: "Source and destination must be different networks." };
  }

  const fromChain = getAllChains().find((c) => c.id === fromChainId);
  const toChain = getAllChains().find((c) => c.id === toChainId);

  if (!fromChain) return { ok: false, reason: "Unknown source network." };
  if (!toChain) return { ok: false, reason: "Unknown destination network." };

  const catalogPair =
    PUBLIC_BRIDGE_PICKER_IDS.includes(fromChainId) || PUBLIC_BRIDGE_PICKER_IDS.includes(toChainId);

  if (!fromChain.bridge?.address) {
    if (catalogPair) {
      return {
        ok: false,
        reason: `Wallet lock needs a NovaBridgeGateway on ${fromChain.name}. ${fromChain.name} → ${toChain.name} is in the catalog. Live lock/release is NovaONE ↔ NRW.`,
      };
    }
    return { ok: false, reason: `No bridge portal deployed on ${fromChain.name}.` };
  }

  if (!isBridgeChainReachable(fromChainId, enabledIds)) {
    if (catalogPair && !NOVA_MESH_BRIDGE_IDS.includes(fromChainId)) {
      return {
        ok: false,
        reason: `Wallet lock needs a NovaBridgeGateway on ${fromChain.name}. ${fromChain.name} → ${toChain.name} is in the catalog. Live lock/release is NovaONE ↔ NRW.`,
      };
    }
    if (fromChain.isInternal && fromChainId !== BRIDGE_VAULT_CHAIN_ID) {
      return {
        ok: false,
        reason: `${fromChain.name} is an internal mesh layer without a browser RPC tunnel.`,
      };
    }
    if (!enabledIds.includes(fromChainId)) {
      return { ok: false, reason: `Enable ${fromChain.name} in Settings → Networks to bridge from it.` };
    }
    return { ok: false, reason: `${fromChain.name} RPC is not reachable from this browser session.` };
  }

  if (toChainId === BRIDGE_VAULT_CHAIN_ID && fromChainId !== BRIDGE_VAULT_CHAIN_ID) {
    return {
      ok: false,
      reason:
        "Inbound mint on AnakaChain Bridge is validator-gated. Lock on the source chain first; mesh operators submit the inbound request after confirmation.",
    };
  }

  if (NOVA_MESH_BRIDGE_IDS.includes(fromChainId) && NOVA_MESH_BRIDGE_IDS.includes(toChainId)) {
    if (!toChain.bridge?.address) {
      return { ok: false, reason: `No bridge gateway deployed on ${toChain.name}.` };
    }
    if (!isBridgeChainReachable(toChainId, enabledIds)) {
      return {
        ok: false,
        reason: `Enable ${toChain.name} in Settings → Networks to receive a NovaONE ↔ NRW lock.`,
      };
    }
    return {
      ok: true,
      pathKind: "nova_lock_release",
      label: "Lock → Release",
      description: `Lock ERC-20 on ${fromChain.name} (${shortAddr(fromChain.bridge.address)}). Bank relayer releases the paired token on ${toChain.name}.`,
      fromChain,
      toChain,
    };
  }

  if (fromChainId === BRIDGE_HUB_CHAIN_ID && SUPER_BRIDGE_SPOKE_IDS.includes(toChainId)) {
    return {
      ok: true,
      pathKind: "hub_lock_mint",
      label: "Lock → Mint",
      description: `Lock ALL on ALLTRA hub (${shortAddr(fromChain.bridge.address)}). Relayer mints wALL on ${toChain.name}.`,
      fromChain,
      toChain,
    };
  }

  if (SUPER_BRIDGE_SPOKE_IDS.includes(fromChainId) && toChainId === BRIDGE_HUB_CHAIN_ID) {
    return {
      ok: true,
      pathKind: "spoke_burn_release",
      label: "Burn → Release",
      description: `Burn wALL on ${fromChain.name} spoke (${shortAddr(fromChain.bridge.address)}). Relayer releases ALL on ALLTRA hub.`,
      fromChain,
      toChain,
    };
  }

  if (fromChainId === BRIDGE_VAULT_CHAIN_ID) {
    if (!toChain.bridge?.address) {
      return { ok: false, reason: `${toChain.name} has no bridge portal for vault outbound routing.` };
    }
    if (!isBridgeChainReachable(toChainId, enabledIds)) {
      return {
        ok: false,
        reason: `Destination ${toChain.name} is not enabled or not reachable for vault release.`,
      };
    }
    if (toChainId === BRIDGE_HUB_CHAIN_ID || SUPER_BRIDGE_SPOKE_IDS.includes(toChainId)) {
      return {
        ok: true,
        pathKind: "vault_outbound",
        label: "Burn → Release",
        description: `Burn wrapped tokens in AnakaChain Bridge vault (${shortAddr(fromChain.bridge.address)}). Validators release on ${toChain.name} after quorum.`,
        fromChain,
        toChain,
      };
    }
    return {
      ok: false,
      reason: `Vault outbound to ${toChain.name} is not wired in the mesh bridge matrix (supported: ALLTRA, Defi Oracle).`,
    };
  }

  if (fromChainId === BRIDGE_HUB_CHAIN_ID && toChainId === BRIDGE_VAULT_CHAIN_ID) {
    return {
      ok: false,
      reason:
        "ALLTRA hub lock targets Super Bridge spokes only. Bridge to Defi Oracle first, or use AnakaChain Bridge vault outbound from chain 11013.",
    };
  }

  if (SUPER_BRIDGE_SPOKE_IDS.includes(fromChainId) || SUPER_BRIDGE_SPOKE_IDS.includes(toChainId)) {
    return {
      ok: false,
      reason: "Super Bridge routes are ALLTRA hub ↔ Defi Oracle only. Other pairs use the AnakaChain Bridge vault.",
    };
  }

  if ([1, 56, 8453, 42161, 651940].includes(fromChainId) || [1, 56, 8453, 42161, 651940].includes(toChainId)) {
    return {
      ok: false,
      reason: `Wallet lock needs a NovaBridgeGateway on both chains. ${fromChain.name} → ${toChain.name} is in the catalog. Live lock/release is NovaONE ↔ NRW. Bank Super Bridge stays on novabank.uk/bridge.`,
    };
  }

  return {
    ok: false,
    reason: "This network pair is not a live wallet lock route. Pick NovaONE ↔ NRW, or use the imported token catalog to see what is missing.",
  };
}

export function externalChainSlug(chain: ChainDef): string {
  return chain.slug;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
