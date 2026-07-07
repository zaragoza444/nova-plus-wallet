import { useCallback, useState } from "react";
import { appendActivityRecord } from "../lib/activity";
import {
  estimateTransfer,
  executeTransfer,
  type TransferEstimate,
  type TransferParams,
  type TransferResult,
} from "../lib/transfer";

export type TransferPhase = "idle" | "estimating" | "confirming" | "pending";

export function useTokenTransfer(): {
  phase: TransferPhase;
  estimate: (params: TransferParams, senderAddress: string) => Promise<
    { ok: true; estimate: TransferEstimate } | { ok: false; message: string }
  >;
  sendTransfer: (
    params: TransferParams,
    senderAddress: string,
    meta: { symbol: string; amount: string },
  ) => Promise<TransferResult>;
} {
  const [phase, setPhase] = useState<TransferPhase>("idle");

  const estimate = useCallback(async (params: TransferParams, senderAddress: string) => {
    setPhase("estimating");
    try {
      return await estimateTransfer(params, senderAddress);
    } finally {
      setPhase("idle");
    }
  }, []);

  const sendTransfer = useCallback(
    async (
      params: TransferParams,
      senderAddress: string,
      meta: { symbol: string; amount: string },
    ): Promise<TransferResult> => {
      setPhase("confirming");
      const pre = await estimateTransfer(params, senderAddress);
      if (!pre.ok) {
        setPhase("idle");
        return pre;
      }

      setPhase("pending");
      try {
        const result = await executeTransfer(params);
        if (result.ok) {
          appendActivityRecord({
            type: "send",
            hash: result.hash,
            chainId: params.chainId,
            chainName: result.chainName,
            symbol: meta.symbol,
            amount: meta.amount,
            to: pre.estimate.recipient,
            explorerUrl: result.explorerUrl,
          });
        }
        return result;
      } finally {
        setPhase("idle");
      }
    },
    [],
  );

  return { phase, estimate, sendTransfer };
};
