import { useMemo } from "react";
import { useTokenBalances } from "./useTokenBalances";
import { usePrefs } from "./useDisplaySettings";
import { filterVisibleRows } from "../lib/prefs";

export function useVisibleTokenRows(address: string | undefined, pollInterval: number) {
  const prefs = usePrefs();
  const { tokenRows, knownTokenKeys, totalUsd, ...rest } = useTokenBalances(address, pollInterval);
  const visible = useMemo(
    () => filterVisibleRows(tokenRows, { listedOrUserByKey: knownTokenKeys, prefs }),
    [tokenRows, knownTokenKeys, prefs],
  );
  const visibleTotalUsd = useMemo(
    () => visible.reduce((s, r) => s + (r.usdEstimate ?? 0), 0),
    [visible],
  );
  return {
    tokenRows: visible,
    allTokenRows: tokenRows,
    totalUsd: visibleTotalUsd,
    rawTotalUsd: totalUsd,
    knownTokenKeys,
    ...rest,
  };
}
