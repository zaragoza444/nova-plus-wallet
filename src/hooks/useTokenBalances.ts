// Signet — live token balances (real ethers reads).
// Reads native + registry + listed + user tokens across enabled reachable chains.
import { useCallback, useState, useEffect } from "react";
import { JsonRpcProvider, Contract, formatUnits } from "ethers";
import type { TokenBalanceRow } from "../types";
import type { ChainDef } from "../lib/chains";
import { useEnabledChains } from "./useEnabledChains";
import {
  collectCoinGeckoIds,
  fetchCoinGeckoPrices,
  resolveUsd,
  type PriceResolveInput,
} from "../lib/prices";
import { getBalanceScanTokens, isPublicEvmChain, type ListedToken } from "../lib/tokenlist";
import { getUserTokensForChain, tokenRecordKey } from "../lib/usertokens";
import { balanceRowKey } from "../lib/prefs";

const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
const RPC_TIMEOUT_MS = 8_000;

export interface ChainBalanceStatus {
  chainId: number;
  chainName: string;
  status: "ok" | "unavailable";
}

function fmt(human: number, symbol: string): string {
  return `${human.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${symbol}`;
}

async function pingRpc(provider: JsonRpcProvider): Promise<boolean> {
  try {
    await Promise.race([
      provider.getBlockNumber(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), RPC_TIMEOUT_MS)),
    ]);
    return true;
  } catch {
    return false;
  }
}

type PendingRow = Omit<TokenBalanceRow, "usdEstimate"> & {
  price: PriceResolveInput;
  /** Registry / list / user — used for spam filter. */
  isKnownToken: boolean;
};

type ChainReadResult = {
  chainId: number;
  chainName: string;
  status: ChainBalanceStatus["status"];
  rows: PendingRow[];
  knownKeys: Set<string>;
};

async function applyUsdEstimates(rows: PendingRow[]): Promise<TokenBalanceRow[]> {
  if (!rows.length) return [];
  const cgPrices = await fetchCoinGeckoPrices(collectCoinGeckoIds(rows.map((r) => r.price)));
  return rows.map(({ price, isKnownToken: _k, ...row }) => ({
    ...row,
    usdEstimate: resolveUsd(price, cgPrices),
  }));
}

type MergedToken = {
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  usd?: number;
  coingeckoId?: string;
  isKnown: boolean;
};

/** Registry first, then listed majors; deduped by lowercased address. */
function mergeTokenSources(chain: ChainDef, listed: ListedToken[]): MergedToken[] {
  const byAddr = new Map<string, MergedToken>();

  for (const t of chain.tokens) {
    if (!t.address || t.standard !== "erc20") continue;
    byAddr.set(t.address.toLowerCase(), {
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      usd: t.usd,
      coingeckoId: t.coingeckoId,
      isKnown: true,
    });
  }

  for (const t of listed) {
    const key = t.address.toLowerCase();
    if (byAddr.has(key)) continue;
    byAddr.set(key, {
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      coingeckoId: t.coingeckoId,
      isKnown: true,
    });
  }

  for (const t of getUserTokensForChain(chain.id)) {
    const key = t.address.toLowerCase();
    if (byAddr.has(key)) continue;
    byAddr.set(key, {
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      isKnown: true,
    });
  }

  return [...byAddr.values()];
}

async function readChain(chain: ChainDef, address: string): Promise<ChainReadResult> {
  const base = { chainId: chain.id, chainName: chain.name };
  const rpc = chain.rpcUrls[0];
  if (!rpc) {
    return { ...base, status: "unavailable", rows: [], knownKeys: new Set() };
  }

  const provider = new JsonRpcProvider(rpc);
  const alive = await pingRpc(provider);
  if (!alive) {
    return { ...base, status: "unavailable", rows: [], knownKeys: new Set() };
  }

  // Public EVM: registry (usually empty) + curated listed majors. Anaka/partner: registry only.
  let listed: ListedToken[] = [];
  if (isPublicEvmChain(chain.id)) {
    listed = await getBalanceScanTokens(chain.id);
  }

  const tokens = mergeTokenSources(chain, listed);
  const rows: PendingRow[] = [];
  const knownKeys = new Set<string>();

  try {
    const bal = await provider.getBalance(address);
    if (bal > 0n) {
      const nc = chain.nativeCurrency;
      const human = Number(formatUnits(bal, nc.decimals));
      const row: PendingRow = {
        token: { symbol: nc.symbol, name: nc.name, decimals: nc.decimals },
        chainId: chain.id,
        chainName: chain.name,
        balance: bal.toString(),
        formatted: fmt(human, nc.symbol),
        price: { symbol: nc.symbol, units: human, usd: nc.usd, coingeckoId: nc.coingeckoId },
        isKnownToken: true,
      };
      rows.push(row);
      knownKeys.add(balanceRowKey(row));
    }
  } catch { /* native read failed */ }

  await Promise.all(
    tokens.map(async (t) => {
      try {
        const c = new Contract(t.address, ERC20_ABI, provider);
        const bal: bigint = await c.balanceOf(address);
        if (bal <= 0n) return;
        const human = Number(formatUnits(bal, t.decimals));
        const row: PendingRow = {
          token: {
            symbol: t.symbol,
            name: t.name,
            decimals: t.decimals,
            address: t.address,
          },
          chainId: chain.id,
          chainName: chain.name,
          balance: bal.toString(),
          formatted: fmt(human, t.symbol),
          price: {
            symbol: t.symbol,
            units: human,
            usd: t.usd,
            coingeckoId: t.coingeckoId,
          },
          isKnownToken: t.isKnown,
        };
        rows.push(row);
        knownKeys.add(balanceRowKey(row));
        if (t.isKnown) {
          knownKeys.add(tokenRecordKey(chain.id, t.address));
        }
      } catch { /* skip token */ }
    }),
  );

  return { ...base, status: "ok", rows, knownKeys };
}

export function useTokenBalances(
  address: string | undefined,
  pollInterval: number,
): {
  tokenRows: TokenBalanceRow[];
  totalUsd: number;
  loading: boolean;
  chainStatus: ChainBalanceStatus[];
  error: string | null;
  refresh: () => void;
  knownTokenKeys: Set<string>;
} {
  const { balanceChains } = useEnabledChains();
  const [tokenRows, setTokenRows] = useState<TokenBalanceRow[]>([]);
  const [knownTokenKeys, setKnownTokenKeys] = useState<Set<string>>(new Set());
  const [chainStatus, setChainStatus] = useState<ChainBalanceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const run = useCallback(async (chains: ChainDef[], mounted: () => boolean) => {
    if (!address || !chains.length) {
      if (!mounted()) return;
      setTokenRows([]);
      setChainStatus([]);
      setKnownTokenKeys(new Set());
      setLoading(false);
      return;
    }

    const results = await Promise.all(
      chains.map(async (c) => {
        try {
          return await readChain(c, address);
        } catch {
          return {
            chainId: c.id,
            chainName: c.name,
            status: "unavailable" as const,
            rows: [] as PendingRow[],
            knownKeys: new Set<string>(),
          };
        }
      }),
    );

    const priced = await applyUsdEstimates(results.flatMap((r) => r.rows));
    const allKnown = new Set<string>();
    for (const r of results) {
      for (const k of r.knownKeys) allKnown.add(k);
    }

    if (!mounted()) return;
    setTokenRows(priced);
    setKnownTokenKeys(allKnown);
    setChainStatus(
      results.map((r) => ({
        chainId: r.chainId,
        chainName: r.chainName,
        status: r.status,
      })),
    );
    setLoading(false);
  }, [address]);

  useEffect(() => {
    if (!address) {
      setTokenRows([]);
      setChainStatus([]);
      setKnownTokenKeys(new Set());
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    void run(balanceChains, () => mounted);

    const id = setInterval(() => void run(balanceChains, () => mounted), pollInterval);

    const onTokens = () => setTick((n) => n + 1);
    window.addEventListener("signet:usertokens-changed", onTokens);

    return () => {
      mounted = false;
      clearInterval(id);
      window.removeEventListener("signet:usertokens-changed", onTokens);
    };
  }, [address, pollInterval, balanceChains, run, tick]);

  const totalUsd = tokenRows.reduce((s, r) => s + (r.usdEstimate ?? 0), 0);

  const error = (() => {
    if (loading) return null;
    if (!address) return null;
    if (!balanceChains.length) {
      return "No browser-reachable networks are enabled. Turn on networks in Settings.";
    }
    if (chainStatus.length > 0 && chainStatus.every((c) => c.status === "unavailable")) {
      return "Unable to reach any enabled network RPC. Check your connection or network settings.";
    }
    return null;
  })();

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return { tokenRows, totalUsd, loading, chainStatus, error, refresh, knownTokenKeys };
}
