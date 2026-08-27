/** NovaONE / NRW World relayer gateway pair. */
export const NOVA_MESH_BRIDGE_IDS: readonly number[] = [22016, 33001];

/** ALL MAINNET hub chain id (Super Bridge). */
export const BRIDGE_HUB_CHAIN_ID = 651940;

/** Chains with a deployed BridgeSpoke in the Super Bridge mesh. */
export const SUPER_BRIDGE_SPOKE_IDS: readonly number[] = [138];

/** AnakaChain Bridge vault layer. */
export const BRIDGE_VAULT_CHAIN_ID = 11013;

/** Canonical ALL token locked on the hub (matches live mesh config). */
export const HUB_CANONICAL_TOKEN = "0x8445976FE32257Eb03B1F02e8A11Fd2c0041ce8c";

/** BridgeVault request status enum (BridgeVault.sol). */
export const VAULT_STATUS = {
  PENDING: 0,
  VALIDATED: 1,
  EXECUTED: 2,
  REJECTED: 3,
  EXPIRED: 4,
} as const;
