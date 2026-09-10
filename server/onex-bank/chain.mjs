const ONEX_CHAIN_ID = 138;
const ONEX_CHAIN_HEX = "0x8a";

const RPC_URLS = [
  process.env.ONEX_RPC_URL,
  "https://rpc.defi-oracle.io",
  "https://novabank.uk/onex-rpc/",
  "https://rpc-http-pub.d-bis.org",
].filter(Boolean);

const RPC_ALLOW = new Set([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_call",
  "eth_gasPrice",
  "eth_estimateGas",
  "eth_sendRawTransaction",
  "eth_getTransactionReceipt",
  "eth_getTransactionCount",
  "eth_getTransactionByHash",
  "net_version",
  "web3_clientVersion",
]);

export { ONEX_CHAIN_ID, ONEX_CHAIN_HEX, RPC_URLS, RPC_ALLOW };

export async function rpcCall(method, params = [], url = RPC_URLS[0]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(body.error.message || "RPC error");
  return body.result;
}

export async function firstLiveRpc() {
  for (const url of RPC_URLS) {
    try {
      const id = await rpcCall("eth_chainId", [], url);
      if (id === ONEX_CHAIN_HEX || Number.parseInt(id, 16) === ONEX_CHAIN_ID) {
        const block = await rpcCall("eth_blockNumber", [], url);
        return { url, blockNumber: block, connected: true };
      }
    } catch {
      /* try next */
    }
  }
  return { url: RPC_URLS[0], blockNumber: null, connected: false };
}

export function chainStatusPayload(live) {
  return {
    network: "DeFi Oracle Meta Mainnet",
    caip2: "eip155:138",
    chainId: ONEX_CHAIN_ID,
    chainIdHex: ONEX_CHAIN_HEX,
    provider: "onexchain",
    enabled: true,
    connected: live.connected,
    rpcUrl: live.url,
    rpcUrls: RPC_URLS,
    explorerUrl: "https://explorer.d-bis.org",
    blockNumber: live.blockNumber,
    wallet: "onexwallet",
    mode: live.connected ? "onexchain_live" : "rpc_pending",
    local: {
      bridge: {
        base: process.env.ONEX_PUBLIC_URL || "http://127.0.0.1:8090",
        walletUi: "/#/onex",
        health: "/api/v1/health/live",
        rpc: "/onex-rpc/",
      },
      node: {
        base: process.env.ONEX_PUBLIC_URL || "http://127.0.0.1:8090",
        explorer: "https://explorer.d-bis.org",
        rpc: live.url,
        status: "/api/v1/onex/status",
        health: "/api/v1/health/live",
      },
      useLocalNode: false,
    },
  };
}

export function chainConfigPayload() {
  return {
    chainId: ONEX_CHAIN_HEX,
    chainName: "OneX Chain (DeFi Oracle Meta)",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["/onex-rpc/", ...RPC_URLS],
    blockExplorerUrls: ["https://explorer.d-bis.org"],
    caip2: "eip155:138",
    chainIdDecimal: ONEX_CHAIN_ID,
    chainIdHex: ONEX_CHAIN_HEX,
    wallet: "onexwallet",
    network: "onex",
  };
}

export async function proxyJsonRpc(body) {
  const method = body?.method;
  if (typeof method !== "string" || !RPC_ALLOW.has(method)) {
    return { jsonrpc: "2.0", id: body?.id ?? null, error: { code: -32601, message: "Method not allowed" } };
  }
  const live = await firstLiveRpc();
  const res = await fetch(live.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: body.id ?? 1, method, params: body.params ?? [] }),
  });
  return res.json();
}
