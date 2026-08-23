const fs = require("fs");

const ZERO = "0x0000000000000000000000000000000000000000";
const j = JSON.parse(fs.readFileSync("C:/Users/novac/nova-plus-wallet/public/nova-chains.json", "utf8"));
const alltraSrc = fs.readFileSync("C:/Users/novac/nova/packages/shared/src/alltra-tokens.ts", "utf8");
const alltra = {};
for (const b of alltraSrc.split(/\n  \{/)) {
  const sym = b.match(/symbol: "([^"]+)"/);
  const addr = b.match(/address: "(0x[0-9a-fA-F]+)"/);
  const dec = b.match(/decimals: (\d+)/);
  const name = b.match(/name: "([^"]+)"/);
  if (sym && addr && dec) {
    alltra[sym[1].toUpperCase()] = {
      symbol: sym[1],
      address: addr[1],
      decimals: Number(dec[1]),
      name: name ? name[1] : sym[1],
    };
  }
}

const ANAKA = {
  USD: { address: "0xb63f04503d4518506e65d3872165e5aba461b745", chainId: 11013, decimals: 6 },
  EUR: { address: "0x531e67d648f4b0d07b9a7e9cfe12af49dac5832d", chainId: 11013, decimals: 6 },
  GBP: { address: "0x31b08dafcb65f8cdff164b8e0c16b57a25a615fb", chainId: 11013, decimals: 6 },
  CHF: { address: "0x4b3fa1ca223067e8ebbcbf2815354990f39932e3", chainId: 11013, decimals: 6 },
  AUD: { address: "0x92788a239d29be0fa27c97a3ba4e2ec1ee1538b9", chainId: 11013, decimals: 6 },
  JPY: { address: "0xbe5a161abda6adf37f01812f21452170b2211674", chainId: 11013, decimals: 6 },
  USDC: { address: "0x0fd6c6cf7d531912fc44905ab5d8f97e7d43796a", chainId: 11013, decimals: 6 },
  USDT: { address: "0x6f51d67518cd630c0ceb8ef639238673b3b78446", chainId: 11013, decimals: 6 },
  ETH: { address: "0x10bee905f8c428b2d95dcd13b5645b36455b4eb8", chainId: 11013, decimals: 18 },
  BTC: { address: "0xc59fbea08e78ad90f3a72d1df32477e3f0298751", chainId: 11013, decimals: 8 },
};

const LOCAL_WRAP = {
  22016: "0x227a6f3EEF2df576bc127dF0326D1F4B6f0ce9Cb",
  33001: "0xf2811B06807acF321FF9056dF668a621772999d8",
};
const SWAP_ROUTER = "0xEd04ee8307C0656207af5afe3926Ae2380052940";
const STABLES = new Set(["USD", "USDC", "USDT", "AUSDC", "AUSDT", "CUSDT", "CUSDC", "KUSD", "EUR", "GBP", "AUD", "CHF", "JPY", "SDG", "CNY"]);
const CG = { ETH: "ethereum", BTC: "bitcoin", WETH: "ethereum", WBTC: "bitcoin", WBNB: "binancecoin", WTRX: "tron", XRP: "ripple" };

function isZero(a) {
  return !a || a.toLowerCase() === ZERO.toLowerCase();
}

function sameAddr(a, b) {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function enrich(chainId, t) {
  const native = t.symbol === (chainId === 22016 ? "NOVA" : "NRW");
  const key = t.symbol.toUpperCase();
  const all = alltra[key] && !isZero(alltra[key].address) ? alltra[key] : null;
  const anaka = ANAKA[key];
  const wrap = LOCAL_WRAP[chainId];
  const raw = isZero(t.address) ? null : t.address;
  const copiedFromAlltra = Boolean(raw && all && sameAddr(raw, all.address));
  let address = null;
  let standard = "meta";
  if (native) {
    address = null;
    standard = "native";
  } else if (key === "USDC") {
    address = wrap;
    standard = "erc20";
  } else if (raw && !copiedFromAlltra && !sameAddr(raw, wrap)) {
    address = raw;
    standard = "erc20";
  }

  let tokenizedAddress = address || undefined;
  let tokenizedChainId = address ? chainId : undefined;
  if (all) {
    tokenizedAddress = all.address;
    tokenizedChainId = 651940;
  } else if (anaka) {
    tokenizedAddress = anaka.address;
    tokenizedChainId = anaka.chainId;
  }

  const out = {
    symbol: t.symbol,
    name: key === "CNY" ? "Chinese Yuan" : t.name,
    decimals: standard === "erc20" && (key === "USDC" || key === "USDT") ? 18 : t.decimals,
    address,
    standard,
  };
  if (STABLES.has(key) || key === "NOVA" || key === "NRW") out.usd = 1;
  if (CG[key]) out.coingeckoId = CG[key];
  if (!native) {
    out.tokenized = true;
    out.settlement = "meta";
    out.liquidity = "nova-settlement-meta";
  }
  if (tokenizedAddress) out.tokenizedAddress = tokenizedAddress;
  if (tokenizedChainId) out.tokenizedChainId = tokenizedChainId;
  return out;
}

function emitTokens(arr) {
  return arr
    .map((t) => {
      const parts = [
        `symbol: ${JSON.stringify(t.symbol)}`,
        `name: ${JSON.stringify(t.name)}`,
        `decimals: ${t.decimals}`,
        `address: ${t.address ? JSON.stringify(t.address) : "null"}`,
        `standard: ${JSON.stringify(t.standard)}`,
      ];
      if (t.usd != null) parts.push(`usd: ${t.usd}`);
      if (t.coingeckoId) parts.push(`coingeckoId: ${JSON.stringify(t.coingeckoId)}`);
      if (t.tokenized) parts.push("tokenized: true");
      if (t.settlement) parts.push('settlement: "meta"');
      if (t.liquidity) parts.push('liquidity: "nova-settlement-meta"');
      if (t.tokenizedAddress) parts.push(`tokenizedAddress: ${JSON.stringify(t.tokenizedAddress)}`);
      if (t.tokenizedChainId) parts.push(`tokenizedChainId: ${t.tokenizedChainId}`);
      return `  { ${parts.join(", ")} }`;
    })
    .join(",\n");
}

const nova = j.chains.find((c) => c.chainId === 22016).tokens.map((t) => enrich(22016, t));
const nrw = j.chains.find((c) => c.chainId === 33001).tokens.map((t) => enrich(33001, t));

function counts(arr) {
  return {
    total: arr.length,
    native: arr.filter((t) => t.standard === "native").length,
    erc20: arr.filter((t) => t.standard === "erc20").length,
    meta: arr.filter((t) => t.standard === "meta").length,
    tokenized: arr.filter((t) => t.tokenized).length,
    withCanonical: arr.filter((t) => t.tokenizedAddress).length,
  };
}

console.log("22016", counts(nova));
console.log("33001", counts(nrw));

const file = `/** Tokenized NovaONE (22016) + NRW World (33001) catalog.
 * Generated from public/nova-chains.json, ALLTRA verified ERC-20s, Anaka wrap rail,
 * and Nova settlement-meta liquidity. Local ERC-20 addresses are only wrapped-bridge
 * contracts on each chain — ALLTRA addresses are canonical tokenized refs, not copied onto the wrong chain.
 */
import type { TokenDef } from "./chains";

export const NOVA_ONE_SWAP_ROUTER = "${SWAP_ROUTER}" as const;
export const NRW_WORLD_SWAP_ROUTER = "${SWAP_ROUTER}" as const;
export const NOVA_ONE_WRAPPED_BRIDGE = "${LOCAL_WRAP[22016]}" as const;
export const NRW_WORLD_WRAPPED_BRIDGE = "${LOCAL_WRAP[33001]}" as const;

export const NOVA_ONE_TOKENS: TokenDef[] = [
${emitTokens(nova)}
];

export const NRW_WORLD_TOKENS: TokenDef[] = [
${emitTokens(nrw)}
];
`;

fs.writeFileSync("C:/Users/novac/nova-plus-wallet/src/lib/nova-mesh-tokens.ts", file);

// Patch nova-chains.json with settlement meta + tokenized fields.
function patchChain(chain, enriched, wrap) {
  chain.settlement = "meta";
  chain.liquidity = "nova-settlement-meta";
  chain.liquidityHubPath =
    chain.chainId === 22016 ? "/api/v1/chains/nova-one/liquidity/hub" : "/api/v1/chains/nrw-world/liquidity/hub";
  chain.wrappedBridge = wrap;
  chain.swapRouter = SWAP_ROUTER;
  const bySym = Object.fromEntries(enriched.map((t) => [t.symbol, t]));
  for (const t of chain.tokens) {
    const e = bySym[t.symbol];
    if (!e) continue;
    t.tokenized = Boolean(e.tokenized);
    t.settlement = e.settlement ?? null;
    t.liquidity = e.liquidity ?? null;
    if (e.tokenizedAddress) t.tokenizedAddress = e.tokenizedAddress;
    if (e.tokenizedChainId) t.tokenizedChainId = e.tokenizedChainId;
    t.native = e.standard === "native";
    t.ledgerOnly = e.standard === "meta";
    if (e.standard === "erc20" && e.address) {
      t.address = e.address;
      t.decimals = e.decimals;
    } else if (e.standard !== "native") {
      t.address = ZERO;
    }
    if (t.symbol === "CNY") t.name = "Chinese Yuan";
  }
}

const novaChain = j.chains.find((c) => c.chainId === 22016);
const nrwChain = j.chains.find((c) => c.chainId === 33001);
patchChain(novaChain, nova, LOCAL_WRAP[22016]);
patchChain(nrwChain, nrw, LOCAL_WRAP[33001]);
j.exportedAt = new Date().toISOString();
fs.writeFileSync("C:/Users/novac/nova-plus-wallet/public/nova-chains.json", JSON.stringify(j, null, 2) + "\n");
console.log("patched nova-chains.json");
