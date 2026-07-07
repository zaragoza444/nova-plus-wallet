import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ChainDef } from "../lib/chains";
import {
  addUserChain,
  bootstrapWorldChains,
  getAllChains,
  getBrowserReachableEnabledChains,
  getCustomChains,
  getDefaultTierChains,
  getEnabledChainIds,
  getEnabledChains,
  getInternalMeshChains,
  getPartnerChains,
  getPrivateBankingChains,
  getPublicEvmChains,
  getWorldChains,
  removeUserChain,
  setEnabledChainIds,
  subscribeNetworksChanged,
  subscribePrivateAccessChanged,
  subscribeWorldChainsReady,
  toggleEnabledChainId,
  type UserChainRecord,
} from "../lib/networks";

let worldBootstrapped = false;

export function useEnabledChains(): {
  enabledIds: number[];
  enabledChains: ChainDef[];
  balanceChains: ChainDef[];
  allChains: ChainDef[];
  defaultTier: ChainDef[];
  publicEvm: ChainDef[];
  worldChains: ChainDef[];
  partnerChains: ChainDef[];
  privateBanking: ChainDef[];
  internalMesh: ChainDef[];
  customChains: ChainDef[];
  isEnabled: (id: number) => boolean;
  toggle: (id: number) => void;
  addCustom: (record: UserChainRecord) => void;
  removeCustom: (id: number) => void;
} {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!worldBootstrapped) {
      worldBootstrapped = true;
      bootstrapWorldChains();
    }
    const bump = () => setTick((n) => n + 1);
    const u1 = subscribeNetworksChanged(bump);
    const u2 = subscribePrivateAccessChanged(bump);
    const u3 = subscribeWorldChainsReady(bump);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const enabledIds = useMemo(() => getEnabledChainIds(), [tick]);
  const allChains = useMemo(() => getAllChains(), [tick]);
  const enabledChains = useMemo(() => getEnabledChains(), [tick, enabledIds, allChains]);
  const balanceChains = useMemo(() => getBrowserReachableEnabledChains(), [tick, enabledIds, allChains]);
  const defaultTier = useMemo(() => getDefaultTierChains(), [tick]);
  const publicEvm = useMemo(() => getPublicEvmChains(), [tick]);
  const worldChains = useMemo(() => getWorldChains(), [tick]);
  const partnerChains = useMemo(() => getPartnerChains(), [tick]);
  const privateBanking = useMemo(() => getPrivateBankingChains(), [tick]);
  const internalMesh = useMemo(() => getInternalMeshChains(), [tick]);
  const customChains = useMemo(() => getCustomChains(), [tick]);

  const isEnabled = useCallback((id: number) => enabledIds.includes(id), [enabledIds]);

  const toggle = useCallback((id: number) => {
    toggleEnabledChainId(id);
  }, []);

  const addCustom = useCallback((record: UserChainRecord) => {
    addUserChain(record);
    const ids = getEnabledChainIds();
    if (!ids.includes(record.id)) {
      setEnabledChainIds([...ids, record.id]);
    }
  }, []);

  const removeCustom = useCallback((id: number) => {
    removeUserChain(id);
    setEnabledChainIds(getEnabledChainIds().filter((x) => x !== id));
  }, []);

  return {
    enabledIds,
    enabledChains,
    balanceChains,
    allChains,
    defaultTier,
    publicEvm,
    worldChains,
    partnerChains,
    privateBanking,
    internalMesh,
    customChains,
    isEnabled,
    toggle,
    addCustom,
    removeCustom,
  };
}
