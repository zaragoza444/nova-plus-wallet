/** BridgeHub on ALLTRA (651940) — lock to mint on spokes; relayer unlocks on burn proofs. */
export const BRIDGE_HUB_ABI = [
  "function lock(uint256 amount, uint256 targetChainId, bytes32 recipient) external",
  "function lockPaused(uint256 targetChainId) view returns (bool)",
  "function token() view returns (address)",
  "event Locked(uint256 indexed sourceChainId, uint256 indexed targetChainId, address indexed sender, uint256 amount, uint256 nonce, bytes32 recipient)",
] as const;

/** BridgeSpoke on partner chains (e.g. 138) — mint from hub proofs; burn to release on hub. */
export const BRIDGE_SPOKE_ABI = [
  "function burnAndSend(uint256 amount, bytes32 recipientOnHub) external",
  "function paused() view returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "event Burned(uint256 indexed sourceChainId, uint256 indexed targetChainId, address indexed sender, uint256 amount, uint256 nonce, bytes32 recipientOnHub)",
] as const;

/** BridgeVault on AnakaChain Bridge (11013) — validator-gated mint/burn. */
export const BRIDGE_VAULT_ABI = [
  "function createOutboundRequest(address tokenContract, string externalChain, address recipient, uint256 amount) external returns (uint256)",
  "function bridgePaused() view returns (bool)",
  "function getRequest(uint256 nonce) view returns ((uint256 nonce, uint8 direction, address tokenContract, string externalChain, string externalTxHash, address sender, address recipient, uint256 amount, uint8 status, uint256 createdAt, uint256 executedAt, uint256 validationCount))",
  "event BridgeRequestCreated(uint256 indexed nonce, uint8 direction, address token, uint256 amount, address sender, address recipient)",
  "event BridgeExecuted(uint256 indexed nonce, uint8 direction, uint256 amount)",
] as const;

export const ERC20_APPROVE_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
] as const;
