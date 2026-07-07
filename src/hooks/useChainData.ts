// Signet — ping enabled, browser-reachable chains for health status dots.
import { useCallback, useEffect, useState } from "react";
import { JsonRpcProvider } from "ethers";
import {
  getEnabledReachableChains,
  subscribeNetworksChanged,
  type ChainDef,
} from "../lib/networks";

export interface ChainInfo {
  chainId: number;
  chainName: string;
  status: "ok" | "down" | "offline";
}

const PING_TIMEOUT_MS = 4_000;

async function pingRpc(rpc: string): Promise<boolean> {
  try {
    const p = new JsonRpcProvider(rpc);
    await Promise.race([
      p.getBlockNumber(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), PING_TIMEOUT_MS)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function pingChain(chain: ChainDef): Promise<ChainInfo> {
  const rpc = chain.rpcUrls[0];
  if (!rpc) {
    return { chainId: chain.id, chainName: chain.name, status: "offline" };
  }
  const ok = await pingRpc(rpc);
  return { chainId: chain.id, chainName: chain.name, status: ok ? "ok" : "down" };
}

export function useChainData(pollInterval: number): { chains: ChainInfo[]; loading: boolean } {
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeNetworksChanged(() => setTick((n) => n + 1)), []);

  const run = useCallback(async (mounted: () => boolean) => {
    const defs = getEnabledReachableChains();
    if (!defs.length) {
      if (mounted()) {
        setChains([]);
        setLoading(false);
      }
      return;
    }
    const infos = await Promise.all(defs.map(pingChain));
    if (mounted()) {
      setChains(infos);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    void run(() => mounted);
    const id = setInterval(() => void run(() => mounted), pollInterval);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [pollInterval, run, tick]);

  return { chains, loading };
}
