// ─────────────────────────────────────────────────────────────────────────────
// Signet — chain registry (with Defi Oracle 138 tokens populated)
// Real values from the live mesh config + verified on-chain token addresses.
// CONFIRM markers = values not yet sourced; they fail loud rather than guess.
// ─────────────────────────────────────────────────────────────────────────────

const CONFIRM = "NEEDS_CONFIRM" as const;

export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
  /** CoinGecko API id for live USD pricing. */
  coingeckoId?: string;
  /** Fixed USD peg (e.g. stable native gas). */
  usd?: number;
}

export interface TokenDef {
  symbol: string;
  name: string;
  decimals: number;
  /** null = the chain's native gas token */
  address: string | null;
  standard?: "native" | "erc20";
  /** fixed USD price (stablecoin peg). If omitted, priced via CoinGecko / oracle. */
  usd?: number;
  /** CoinGecko API id for live USD pricing when not pegged. */
  coingeckoId?: string;
}

export type ChainCategory = "anaka" | "partner" | "public";
export type ChainTier = "public" | "partner" | "world" | "private-banking";

export interface ChainDef {
  id: number;
  name: string;
  slug: string;
  nativeCurrency: NativeCurrency;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconColor: string;
  category: ChainCategory;
  tier: ChainTier;
  isDefault: boolean;
  isInternal: boolean;
  bridge?: { address: string };
  tokens: TokenDef[];
}

// Verified live on chain 138 (Defi Oracle Meta) — 17 tokens.
const DEFI_ORACLE_TOKENS: TokenDef[] = [
  { symbol: "USDT", name: "Tether USD (Official)", decimals: 6, address: "0x004b63A7B5b0E06f6bB6adb4a5F9f590BF3182D1", standard: "erc20", usd: 1 },
  { symbol: "USDC", name: "USD Coin (Official)", decimals: 6, address: "0x71D6687F38b93CCad569Fa6352c876eea967201b", standard: "erc20", usd: 1 },
  { symbol: "cUSDT", name: "Tether USD (Compliant)", decimals: 6, address: "0x93E66202A11B1772E55407B32B44e5Cd8eda7f22", standard: "erc20", usd: 1 },
  { symbol: "cUSDC", name: "USD Coin (Compliant)", decimals: 6, address: "0xf22258f57794CC8E06237084b353Ab30fFfa640b", standard: "erc20", usd: 1 },
  { symbol: "cBTC", name: "Bitcoin (Compliant)", decimals: 8, address: "0xe94260c555aC1d9D3CC9E1632883452ebDf0082E", standard: "erc20", coingeckoId: "bitcoin" },
  { symbol: "cBTConBSC", name: "Bitcoin on BSC (Compliant)", decimals: 18, address: "0x3B1c085D344c1e4Af719D59753bF58Ef7ED1E180", standard: "erc20", coingeckoId: "bitcoin" },
  { symbol: "cXAUC", name: "Gold (Compliant)", decimals: 6, address: "0x290E52a8819A4fbD0714E517225429aA2B70EC6b", standard: "erc20" },
  { symbol: "cUSDW", name: "Wrapped USD", decimals: 6, address: "0xcA6BFa614935f1AB71c9aB106bAA6FBB6057095e", standard: "erc20", usd: 1 },
  { symbol: "cDAI", name: "Dai", decimals: 6, address: "0x8D538fA0d63b8f9cbEC9984eB1e275672BD5372d", standard: "erc20", usd: 1 },
  { symbol: "cFRAX", name: "Frax", decimals: 6, address: "0x4b6c8035e66C12da1F5bCfCDF931950aC4A81077", standard: "erc20", usd: 1 },
  { symbol: "cTUSD", name: "TrueUSD", decimals: 6, address: "0x24f12Dd1282d6Cfc334CCb8F99A101E926B40624", standard: "erc20", usd: 1 },
  { symbol: "cPYUSD", name: "PayPal USD", decimals: 6, address: "0x744a059Dd8b797E1c772C06dB6613BB9D8119B93", standard: "erc20", usd: 1 },
  { symbol: "cFDUSD", name: "First Digital USD", decimals: 6, address: "0xAb013f806c6cC51d02CFC88a601Fb85bD70fA83E", standard: "erc20", usd: 1 },
  { symbol: "cUSDE", name: "Ethena USDe", decimals: 6, address: "0xA0Eb0C562B9CC3b03ffAD02bcC52B716aD08b1D4", standard: "erc20", usd: 1 },
  { symbol: "cAUSDT", name: "ALLTRA USDT", decimals: 6, address: "0x5fdDF65733e3d590463F68f93Cf16E8c04081271", standard: "erc20", usd: 1 },
  { symbol: "LIXAU", name: "LIXAU (Gold)", decimals: 6, address: "0x1Ef5579Bed4a99301943aF5B9aC9a0C1b00ddB91", standard: "erc20" },
  { symbol: "LIPMG", name: "LIPMG (Palladium)", decimals: 6, address: "0xD920da2D8A9c1Cd31f4853969F1492C0B6527d9b", standard: "erc20" },
];

export const CHAINS: ChainDef[] = [
  {
    id: 22016, name: "NovaONE", slug: "novaone",
    nativeCurrency: { name: "NovaONE", symbol: "NOVA", decimals: 18 },
    rpcUrls: [
      "https://novabank.uk/novaone-rpc/",
    ],
    blockExplorerUrls: ["https://novabank.uk"],
    iconColor: "#5B8DEF", category: "anaka", tier: "private-banking", isDefault: true, isInternal: false,
    tokens: [{ symbol: "NOVA", name: "NovaONE Native", decimals: 18, address: null, standard: "native" }],
  },
  {
    id: 33001, name: "NRW World", slug: "nrw-world",
    nativeCurrency: { name: "NRW World", symbol: "NRW", decimals: 18 },
    rpcUrls: [
      "https://novabank.uk/nrw-rpc/",
      "https://nrw-world-chain-production-6029.up.railway.app",
    ],
    blockExplorerUrls: ["https://novabank.uk"],
    iconColor: "#A855F7", category: "partner", tier: "partner", isDefault: true, isInternal: false,
    tokens: [{ symbol: "NRW", name: "NRW World Native", decimals: 18, address: null, standard: "native" }],
  },
  {
    id: 9001, name: "Nova Production", slug: "nova-production",
    nativeCurrency: { name: "Nova Gas", symbol: "NGAS", decimals: 18 },
    rpcUrls: [
      "https://novabank.uk/rpc",
    ],
    blockExplorerUrls: ["https://novabank.uk"],
    iconColor: "#8B5CF6", category: "anaka", tier: "partner", isDefault: false, isInternal: true,
    tokens: [{ symbol: "NGAS", name: "Nova Production Gas", decimals: 18, address: null, standard: "native" }],
  },
  {
    id: 11011, name: "AnakaChain", slug: "anakachain",
    nativeCurrency: { name: "Anaka Gas", symbol: "AGAS", decimals: 18 },
    rpcUrls: ["https://rpc.anakachain.com"],
    blockExplorerUrls: ["https://explorer.anakachain.com"],
    iconColor: "#C9A84C", category: "anaka", tier: "public", isDefault: false, isInternal: false,
    tokens: [{ symbol: "AGAS", name: "Anaka Gas", decimals: 18, address: null, standard: "native" }],
  },
  {
    id: 138, name: "Defi Oracle Meta", slug: "defi-oracle",
    nativeCurrency: { name: CONFIRM, symbol: CONFIRM, decimals: 18 }, // CONFIRM native symbol
    rpcUrls: ["https://rpc-http-pub.d-bis.org"],
    blockExplorerUrls: ["https://explorer.d-bis.org"],
    iconColor: "#2DD4BF", category: "partner", tier: "partner", isDefault: true, isInternal: false,
    bridge: { address: "0x8445976FE32257Eb03B1F02e8A11Fd2c0041ce8c" },
    tokens: DEFI_ORACLE_TOKENS,
  },
  {
    id: 651940, name: "ALLTRA", slug: "alltra",
    nativeCurrency: { name: "ALLTRA", symbol: "ALL", decimals: 18 },
    rpcUrls: [
      "https://novabank.uk/alltra-rpc/",
      "https://mainnet-rpc.alltra.global",
    ],
    blockExplorerUrls: ["https://alltra.global"],
    iconColor: "#E8D48B", category: "partner", tier: "partner", isDefault: true, isInternal: false,
    bridge: { address: "0xF26810aF91954B1335a5e60486b50d36535A2A35" },
    tokens: [
      { symbol: "ALL", name: "ALLTRA", decimals: 18, address: null, standard: "native", coingeckoId: "all" },
      { symbol: "AUSDT", name: "ALLTRA USDT", decimals: 18, address: "0x015B1897Ed5279930bC2Be46F661894d219292A6", standard: "erc20", usd: 1 },
      { symbol: "AUSDC", name: "ALLTRA USDC", decimals: 18, address: "0xa95EeD79f84E6A0151eaEb9d441F9Ffd50e8e881", standard: "erc20", usd: 1 },
      { symbol: "USDC", name: "USD Coin", decimals: 18, address: "0xa95eed79f84e6a0151eaeb9d441f9ffd50e8e881", standard: "erc20", usd: 1 },
      { symbol: "USDT-LEGACY", name: "Tether USD (Legacy)", decimals: 18, address: "0xB5A55d36cF82Ec4Eea9813a82e81a631610459c8", standard: "erc20", usd: 1 },
      { symbol: "USDT-BNB", name: "Tether USD (BNB / BEP20)", decimals: 18, address: "0xdaC78a6054C4255AD72B65a87eea2E0c865697Fa", standard: "erc20", usd: 1 },
      { symbol: "USDT-TRC20", name: "Tether USD (TRC20)", decimals: 18, address: "0x1B71cA166C7B32561C483F35A73316B88cdC5027", standard: "erc20", usd: 1 },
      { symbol: "WETH", name: "Wrapped Ether", decimals: 18, address: "0x798F6762BB40d6801A593459d08F890603D3979C", standard: "erc20", coingeckoId: "ethereum" },
      { symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8, address: "0x66971b907dfcc6325124af427fc7f97656a68e9c", standard: "erc20", coingeckoId: "bitcoin" },
      { symbol: "WBNB", name: "Wrapped BNB", decimals: 18, address: "0xfE6E0aEd4Ca571BFbF3C3ae7Bf01fcA40B4716d3", standard: "erc20", coingeckoId: "binancecoin" },
      { symbol: "WTRX", name: "Wrapped TRX", decimals: 18, address: "0xaA7d8C0B6119148DE1456EC0025f9A7b2Dd41A4F", standard: "erc20", coingeckoId: "tron" },
    ],
  },

  {
    id: 1, name: "Ethereum", slug: "ethereum",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18, coingeckoId: "ethereum" },
    rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com"],
    blockExplorerUrls: ["https://etherscan.io"],
    iconColor: "#627EEA", category: "public", tier: "world", isDefault: false, isInternal: false,
    tokens: [
      { symbol: "ETH", name: "Ether", decimals: 18, address: null, standard: "native", coingeckoId: "ethereum" },
      { symbol: "WETH", name: "Wrapped Ether", decimals: 18, address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", standard: "erc20", coingeckoId: "weth" },
      { symbol: "USDT", name: "Tether USD", decimals: 6, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", standard: "erc20", usd: 1 },
      { symbol: "USDC", name: "USD Coin", decimals: 6, address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", standard: "erc20", usd: 1 },
      { symbol: "WBTC", name: "Wrapped Bitcoin", decimals: 8, address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", standard: "erc20", coingeckoId: "wrapped-bitcoin" },
    ],
  },
  {
    id: 56, name: "BNB Chain", slug: "bnb",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18, coingeckoId: "binancecoin" },
    rpcUrls: ["https://bsc-dataseed.binance.org", "https://bsc.llamarpc.com"],
    blockExplorerUrls: ["https://bscscan.com"],
    iconColor: "#F0B90B", category: "public", tier: "world", isDefault: false, isInternal: false,
    tokens: [
      { symbol: "BNB", name: "BNB", decimals: 18, address: null, standard: "native", coingeckoId: "binancecoin" },
      { symbol: "WBNB", name: "Wrapped BNB", decimals: 18, address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", standard: "erc20", coingeckoId: "wbnb" },
      { symbol: "USDT", name: "Tether USD", decimals: 18, address: "0x55d398326f99059fF775485246999027B3197955", standard: "erc20", usd: 1 },
      { symbol: "USDC", name: "USD Coin", decimals: 18, address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", standard: "erc20", usd: 1 },
    ],
  },
  { id: 42161, name: "Arbitrum One", slug: "arbitrum", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18, coingeckoId: "ethereum" }, rpcUrls: ["https://arbitrum.llamarpc.com"], blockExplorerUrls: ["https://arbiscan.io"], iconColor: "#28A0F0", category: "public", tier: "world", isDefault: false, isInternal: false, tokens: [] },
  { id: 8453, name: "Base", slug: "base", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18, coingeckoId: "ethereum" }, rpcUrls: ["https://base.llamarpc.com"], blockExplorerUrls: ["https://basescan.org"], iconColor: "#0052FF", category: "public", tier: "world", isDefault: false, isInternal: false, tokens: [] },
  { id: 137, name: "Polygon", slug: "polygon", nativeCurrency: { name: "Polygon", symbol: "POL", decimals: 18, coingeckoId: "polygon-ecosystem-token" }, rpcUrls: ["https://polygon.llamarpc.com"], blockExplorerUrls: ["https://polygonscan.com"], iconColor: "#8247E5", category: "public", tier: "world", isDefault: false, isInternal: false, tokens: [] },
  { id: 10, name: "Optimism", slug: "optimism", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18, coingeckoId: "ethereum" }, rpcUrls: ["https://optimism.llamarpc.com"], blockExplorerUrls: ["https://optimistic.etherscan.io"], iconColor: "#FF0420", category: "public", tier: "world", isDefault: false, isInternal: false, tokens: [] },
  { id: 43114, name: "Avalanche", slug: "avalanche", nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18, coingeckoId: "avalanche-2" }, rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"], blockExplorerUrls: ["https://snowtrace.io"], iconColor: "#E84142", category: "public", tier: "world", isDefault: false, isInternal: false, tokens: [] },
  { id: 100, name: "Gnosis", slug: "gnosis", nativeCurrency: { name: "xDAI", symbol: "XDAI", decimals: 18, usd: 1 }, rpcUrls: ["https://rpc.gnosischain.com"], blockExplorerUrls: ["https://gnosisscan.io"], iconColor: "#3E6957", category: "public", tier: "world", isDefault: false, isInternal: false, tokens: [] },

  { id: 11012, name: "AnakaChain Tokenisation", slug: "anaka-tokenisation", nativeCurrency: { name: "Anaka Gas", symbol: "AGAS", decimals: 18 }, rpcUrls: ["https://assets.anakachain.com"], blockExplorerUrls: ["https://explorer.anakachain.com"], iconColor: "#C9A84C", category: "anaka", tier: "private-banking", isDefault: false, isInternal: false, tokens: [] },
  { id: 11013, name: "AnakaChain Bridge", slug: "anaka-bridge", nativeCurrency: { name: "Anaka Gas", symbol: "AGAS", decimals: 18 }, rpcUrls: ["https://bridge.anakachain.com"], blockExplorerUrls: ["https://explorer.anakachain.com"], iconColor: "#C9A84C", category: "anaka", tier: "private-banking", isDefault: false, isInternal: false, bridge: { address: "0x5E2748af1D0a21b5a58Aa827a38Fd9ccD7AA4251" },
    // ComplianceToken decimals verified on-chain via https://bridge.anakachain.com (2026-07-01).
    tokens: [
      { symbol: "wUSD", name: "Wrapped USD", decimals: 6, address: "0xb63f04503d4518506e65d3872165e5aba461b745", standard: "erc20", usd: 1 },
      { symbol: "wEUR", name: "Wrapped EUR", decimals: 6, address: "0x531e67d648f4b0d07b9a7e9cfe12af49dac5832d", standard: "erc20" },
      { symbol: "wGBP", name: "Wrapped GBP", decimals: 6, address: "0x31b08dafcb65f8cdff164b8e0c16b57a25a615fb", standard: "erc20" },
      { symbol: "wAUD", name: "Wrapped AUD", decimals: 6, address: "0x92788a239d29be0fa27c97a3ba4e2ec1ee1538b9", standard: "erc20" },
      { symbol: "wJPY", name: "Wrapped JPY", decimals: 6, address: "0xbe5a161abda6adf37f01812f21452170b2211674", standard: "erc20" },
      { symbol: "wCHF", name: "Wrapped CHF", decimals: 6, address: "0x4b3fa1ca223067e8ebbcbf2815354990f39932e3", standard: "erc20" },
      { symbol: "wSGD", name: "Wrapped SGD", decimals: 6, address: "0x23d7b961e68bfb175e255d1a330086bd1beffd52", standard: "erc20" },
      { symbol: "wUSDC", name: "Wrapped USDC", decimals: 6, address: "0x0fd6c6cf7d531912fc44905ab5d8f97e7d43796a", standard: "erc20", usd: 1 },
      { symbol: "wUSDT", name: "Wrapped USDT", decimals: 6, address: "0x6f51d67518cd630c0ceb8ef639238673b3b78446", standard: "erc20", usd: 1 },
      { symbol: "wETH", name: "Wrapped Ether", decimals: 18, address: "0x10bee905f8c428b2d95dcd13b5645b36455b4eb8", standard: "erc20", coingeckoId: "weth" },
      { symbol: "wBTC", name: "Wrapped Bitcoin", decimals: 8, address: "0xc59fbea08e78ad90f3a72d1df32477e3f0298751", standard: "erc20", coingeckoId: "wrapped-bitcoin" },
    ] },
  { id: 11014, name: "AnakaChain Sovereign", slug: "anaka-sovereign", nativeCurrency: { name: "Anaka Gas", symbol: "AGAS", decimals: 18 }, rpcUrls: ["https://sovereign.anakachain.com"], blockExplorerUrls: ["https://explorer.anakachain.com"], iconColor: "#C9A84C", category: "anaka", tier: "private-banking", isDefault: false, isInternal: false, tokens: [] },
  { id: 11015, name: "AnakaChain Enclave", slug: "anaka-enclave", nativeCurrency: { name: "Anaka Gas", symbol: "AGAS", decimals: 18 }, rpcUrls: ["https://enclave.anakachain.com"], blockExplorerUrls: ["https://explorer.anakachain.com"], iconColor: "#C9A84C", category: "anaka", tier: "private-banking", isDefault: false, isInternal: false, tokens: [] },
];

export function isPrivateBankingChain(chain: ChainDef): boolean {
  return chain.tier === "private-banking";
}

export const BUILTIN_CHAIN_IDS = new Set(CHAINS.map((c) => c.id));

export const DEFAULT_CHAIN_IDS = CHAINS.filter((c) => c.isDefault).map((c) => c.id);
export function getChain(id: number): ChainDef | undefined { return CHAINS.find((c) => c.id === id); }
export function getDefaultChains(): ChainDef[] { return CHAINS.filter((c) => c.isDefault); }
export function getToggleableChains(): ChainDef[] { return CHAINS.filter((c) => !c.isDefault); }
export function getBrowserReachableChains(): ChainDef[] {
  return CHAINS.filter((c) => !c.isInternal && c.rpcUrls.length > 0 && !c.rpcUrls.includes(CONFIRM));
}
export function isConfigured(c: ChainDef): boolean { return c.id !== 0 && c.rpcUrls.length > 0 && !c.rpcUrls.includes(CONFIRM); }
