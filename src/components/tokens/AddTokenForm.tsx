import { useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useEnabledChains } from "../../hooks/useEnabledChains";
import { addUserTokenByAddress } from "../../lib/usertokens";
import { addWatchedToken } from "../../lib/tokenlist";
import { getChain } from "../../lib/chains";
import { getAllChains } from "../../lib/networks";

export function AddTokenForm(): JSX.Element {
  const { pushToast } = useToast();
  const { enabledChains } = useEnabledChains();
  const [chainId, setChainId] = useState(enabledChains[0]?.id ?? 1);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const chain = getAllChains().find((c) => c.id === chainId) ?? getChain(chainId);
  const rpc = chain?.rpcUrls[0];

  const submit = async () => {
    setFormError(null);
    if (!chain || !rpc || rpc === "NEEDS_CONFIRM") {
      setFormError("Select an enabled network with a reachable RPC URL.");
      return;
    }
    if (!address.trim()) {
      setFormError("Enter a contract address.");
      return;
    }
    setBusy(true);
    const result = await addUserTokenByAddress(chainId, rpc, address.trim());
    setBusy(false);
    if (result.ok) {
      addWatchedToken(chainId, result.record.address);
      pushToast({
        title: "Token added",
        body: `${result.record.symbol} (${result.record.decimals} decimals) on ${chain.name}`,
        tone: "success",
      });
      setAddress("");
      setFormError(null);
    } else {
      setFormError(result.message);
    }
  };

  if (!enabledChains.length) {
    return (
      <p className="text-sm text-signet-muted">Enable a network in Settings to add custom tokens.</p>
    );
  }

  return (
    <div className="glass-card space-y-3 p-4">
      <h3 className="font-heading text-sm font-semibold text-signet-text">Add token by address</h3>
      <p className="text-xs text-signet-muted">
        Signet reads symbol(), name(), and decimals() from the contract. Addresses with no bytecode (getCode === &quot;0x&quot;) are rejected.
      </p>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-signet-muted">Network</span>
        <select
          className="w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-surface px-3 text-sm"
          value={chainId}
          onChange={(e) => {
            setChainId(Number(e.target.value));
            setFormError(null);
          }}
        >
          {enabledChains.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.id})
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-[11px] font-medium text-signet-muted">Contract address</span>
        <input
          type="text"
          className="w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-surface px-3 font-mono text-sm"
          placeholder="0x…"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            setFormError(null);
          }}
        />
      </label>
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-signet-danger/40 bg-signet-danger-soft px-3 py-2.5 text-sm text-signet-danger"
        >
          {formError}
        </div>
      )}
      <button type="button" className="btn-primary w-full" disabled={busy || !address.trim()} onClick={() => void submit()}>
        {busy ? "Verifying on-chain…" : "Add token"}
      </button>
    </div>
  );
}
