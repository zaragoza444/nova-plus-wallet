/** Contextual insight copy — institutional tone, not conversational chat. */
export type InsightDef = {
  title: string;
  body: string;
  action?: { label: string; to: string };
};

export const INSIGHTS = {
  dashboard: (chainCount: number): InsightDef => ({
    title: chainCount > 1 ? "Multi-chain exposure" : "Single-network view",
    body:
      chainCount > 1
        ? "Balances span multiple networks. Confirm the destination chain before sending or bridging."
        : "Enable additional networks in Settings to surface balances across the mesh.",
    action: chainCount <= 1 ? { label: "Network settings", to: "/app/settings/network" } : undefined,
  }),
  send: {
    title: "Verify before signing",
    body: "Double-check the recipient address and network. On-chain transfers cannot be reversed.",
  },
  receive: {
    title: "Network must match",
    body: "Senders must use the same chain you select here. Wrong-network deposits may be unrecoverable.",
  },
  swap: {
    title: "Settlement meta liquidity",
    body: "NovaONE and NRW World quotes use Nova settlement meta (m2) liquidity hubs. Public EVM pairs still quote through 1inch.",
    action: { label: "Bridge instead", to: "/app/bridge" },
  },
  bridge: {
    title: "Relayer confirmation",
    body: "Lock and burn routes require mesh relayer or validator confirmation before destination credit.",
  },
  tokensEmpty: {
    title: "No balances detected",
    body: "Fund your address on an enabled network, or turn on additional chains in Settings.",
    action: { label: "Receive funds", to: "/app/receive" },
  },
  assetsEmpty: {
    title: "No tokenised holdings",
    body: "ATKSH and PROP positions appear here once registered tokens show a balance on reachable networks.",
  },
  chart: {
    title: "Live market data only",
    body: "Charts require a CoinGecko feed. Nova+ never renders synthetic price history.",
  },
} as const;
