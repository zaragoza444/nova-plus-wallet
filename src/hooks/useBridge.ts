import { formatUnits } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useWalletContext } from "../context/WalletContext";
import {
  appendBridgeRecord,
  getBridgeRecords,
  pollBridgeRecordStatuses,
  type BridgeRecord,
} from "../lib/bridge/history";
import {
  executeBridge,
  readBridgeTokenBalance,
  validateBridgeInput,
  type BridgeExecuteParams,
  type BridgePreview,
} from "../lib/bridge/execute";
import { evaluateBridgeRoute, getBridgePortalChains, type BridgeRouteResult } from "../lib/bridge/routes";
import { bridgeTokensForRoute, type BridgeToken } from "../lib/bridge/tokens";
import { useEnabledChains } from "./useEnabledChains";

export type BridgePhase = "idle" | "loading_balance" | "executing";

export function useBridge() {
  const { address, setChainId } = useWalletContext();
  const { enabledIds } = useEnabledChains();
  const [records, setRecords] = useState<BridgeRecord[]>(() => getBridgeRecords());
  const [fromChainId, setFromChainId] = useState(651940);
  const [toChainId, setToChainId] = useState(138);
  const [token, setToken] = useState<BridgeToken | null>(null);
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [balanceWei, setBalanceWei] = useState<bigint>(0n);
  const [phase, setPhase] = useState<BridgePhase>("idle");
  const [preview, setPreview] = useState<BridgePreview | null>(null);

  const portalChains = useMemo(() => getBridgePortalChains(), []);

  useEffect(() => {
    if (!portalChains.length) return;
    if (!portalChains.some((c) => c.id === fromChainId)) {
      setFromChainId(portalChains[0]!.id);
    }
    if (!portalChains.some((c) => c.id === toChainId)) {
      const alt = portalChains.find((c) => c.id !== fromChainId);
      setToChainId(alt?.id ?? portalChains[0]!.id);
    }
  }, [portalChains, fromChainId, toChainId]);

  const route: BridgeRouteResult = useMemo(
    () => evaluateBridgeRoute(fromChainId, toChainId, enabledIds),
    [fromChainId, toChainId, enabledIds],
  );

  const availableTokens = useMemo(() => {
    if (!route.ok) return [];
    return bridgeTokensForRoute(fromChainId, route.pathKind);
  }, [route, fromChainId]);

  useEffect(() => {
    if (!availableTokens.length) {
      setToken(null);
      return;
    }
    setToken((prev) => {
      if (prev && availableTokens.some((t) => t.address === prev.address)) return prev;
      return availableTokens[0] ?? null;
    });
  }, [availableTokens]);

  useEffect(() => {
    if (address) setRecipient((r) => r || address);
  }, [address]);

  useEffect(() => {
    setRecords(getBridgeRecords());
    void pollBridgeRecordStatuses().then(() => setRecords(getBridgeRecords()));
    const id = window.setInterval(() => {
      void pollBridgeRecordStatuses().then(() => setRecords(getBridgeRecords()));
    }, 20_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!address || !token || !route.ok) {
      setBalanceWei(0n);
      return;
    }
    let cancelled = false;
    setPhase("loading_balance");
    readBridgeTokenBalance(fromChainId, token, address)
      .then((bal) => {
        if (!cancelled) setBalanceWei(bal);
      })
      .catch(() => {
        if (!cancelled) setBalanceWei(0n);
      })
      .finally(() => {
        if (!cancelled) setPhase("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [address, token, fromChainId, route]);

  const balanceFormatted = useMemo(() => {
    if (!token) return "0";
    try {
      return formatUnits(balanceWei, token.decimals);
    } catch {
      return "0";
    }
  }, [balanceWei, token]);

  const buildParams = useCallback((): BridgeExecuteParams | null => {
    if (!route.ok || !token) return null;
    return {
      pathKind: route.pathKind,
      fromChainId,
      toChainId,
      token,
      amountText: amount,
      recipient,
      balanceWei,
    };
  }, [route, token, fromChainId, toChainId, amount, recipient, balanceWei]);

  const prepareReview = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    if (!route.ok) return { ok: false, message: route.reason };
    const params = buildParams();
    if (!params) return { ok: false, message: "Select a token and amount." };
    const result = validateBridgeInput(params, route.label);
    if (!result.ok) return result;
    setPreview(result.preview);
    return { ok: true };
  }, [route, buildParams]);

  const confirmBridge = useCallback(async (): Promise<
    { ok: true; record: BridgeRecord } | { ok: false; message: string }
  > => {
    if (!route.ok || !preview) return { ok: false, message: "Review data missing." };
    const params = buildParams();
    if (!params) return { ok: false, message: "Invalid bridge parameters." };

    setPhase("executing");
    setChainId(fromChainId);
    const result = await executeBridge(params);
    setPhase("idle");

    if (!result.ok) return result;

    const record = appendBridgeRecord({
      pathKind: route.pathKind,
      pathLabel: route.label,
      fromChainId,
      fromChainName: route.fromChain.name,
      toChainId,
      toChainName: route.toChain.name,
      tokenSymbol: params.token.symbol,
      amount: params.amountText.trim(),
      recipient: preview.recipient,
      portalAddress: route.fromChain.bridge!.address,
      sourceTxHash: result.hash,
      sourceExplorerUrl: result.explorerUrl,
      bridgeNonce: result.bridgeNonce,
      status: result.pendingRelayer
        ? "pending_relayer"
        : route.pathKind === "vault_outbound"
          ? "pending_validation"
          : "submitted",
      statusDetail: result.pendingRelayer
        ? "Source transaction confirmed. Mesh relayer will mint or release on the destination chain."
        : "Vault outbound request created. Validators will release after quorum.",
    });
    setRecords(getBridgeRecords());
    setAmount("");
    setPreview(null);
    return { ok: true, record };
  }, [route, preview, buildParams, fromChainId, toChainId, setChainId]);

  const swapDirection = useCallback(() => {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
    setAmount("");
  }, [fromChainId, toChainId]);

  return {
    address,
    portalChains,
    fromChainId,
    setFromChainId,
    toChainId,
    setToChainId,
    swapDirection,
    route,
    availableTokens,
    token,
    setToken,
    amount,
    setAmount,
    recipient,
    setRecipient,
    balanceFormatted,
    balanceWei,
    phase,
    preview,
    setPreview,
    prepareReview,
    confirmBridge,
    records,
  };
}
