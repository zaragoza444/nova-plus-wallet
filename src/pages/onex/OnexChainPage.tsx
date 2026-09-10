import { useEffect, useState } from "react";
import { useOnexBank } from "../../context/OnexBankContext";
import { onexGetJson, ONEX_CHAIN_ID } from "../../lib/onex-api";

type ChainStatus = {
  connected?: boolean;
  chainId?: number;
  blockNumber?: string;
  rpcUrl?: string;
  network?: string;
};

export function OnexChainPage(): JSX.Element {
  const { apiBase, accounts, depositAddress, syncChain } = useOnexBank();
  const vault = accounts.find((a) => a.currency === "ETH");
  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!apiBase) return;
    void onexGetJson(`${apiBase}/onex/status`).then((body) => {
      if (body && typeof body === "object") setStatus(body as ChainStatus);
    });
    void depositAddress().then(setAddress);
  }, [apiBase, depositAddress]);

  const addToWallet = async () => {
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!eth) {
      setMsg("Install MetaMask or OneX Wallet.");
      return;
    }
    try {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x8a",
          chainName: "OneX Chain (DeFi Oracle Meta)",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.defi-oracle.io"],
          blockExplorerUrls: ["https://explorer.d-bis.org"],
        }],
      });
      setMsg("OneX Chain added to your browser wallet.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Wallet rejected the chain.");
    }
  };

  const onSync = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const bal = await syncChain();
      setMsg(`Synced on-chain ETH: ${bal ?? vault?.balance ?? "0"}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-heading text-2xl font-semibold">OneX Chain</h1>
      <p className="text-xs text-signet-muted">
        eip155:{ONEX_CHAIN_ID} · DeFi Oracle Meta. Nova Online Bank uses this as CRYPTO_PROVIDER=onexchain.
      </p>
      <div className="rounded-2xl border border-signet-border bg-signet-surface p-4 text-sm">
        <p>Network: {status?.network ?? "OneX"}</p>
        <p>RPC: {status?.connected ? "connected" : "pending"} · {status?.rpcUrl ?? "—"}</p>
        <p className="font-mono text-[11px] text-signet-muted">block {status?.blockNumber ?? "—"}</p>
        <p className="mt-2">Ledger ETH: {vault?.balance ?? "0"}</p>
        <p className="break-all font-mono text-[11px] text-signet-gold-muted">Deposit {address ?? "…"}</p>
      </div>
      <div className="flex flex-col gap-2">
        <button type="button" className="btn-primary" onClick={() => void addToWallet()}>Add chain to wallet</button>
        <button type="button" className="btn-secondary" disabled={busy} onClick={() => void onSync()}>
          {busy ? "Syncing…" : "Sync on-chain balance"}
        </button>
      </div>
      {msg && <p className="text-sm text-signet-muted">{msg}</p>}
    </div>
  );
}
