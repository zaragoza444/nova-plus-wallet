import { useState, useMemo, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { useEnabledChains } from "../../hooks/useEnabledChains";
import { searchListedTokens, addWatchedToken, type ListedToken } from "../../lib/tokenlist";
import { addUserTokenByAddress } from "../../lib/usertokens";
import { getAllChains } from "../../lib/networks";
import { isAddress } from "ethers";
import { isSettlementMetaChain } from "../../lib/settlement-meta";

export function SearchTokens(): JSX.Element {
  const { pushToast } = useToast();
  const { enabledChains } = useEnabledChains();
  const [chainId, setChainId] = useState(enabledChains[0]?.id ?? 1);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListedToken[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const chain = useMemo(
    () => getAllChains().find((c) => c.id === chainId) ?? enabledChains[0],
    [chainId, enabledChains],
  );
  const rpc = chain?.rpcUrls[0];

  const runSearch = useCallback(async () => {
    setErr(null);
    setResults([]);
    const q = query.trim();
    if (!q || !chain) return;
    if (isAddress(q)) {
      if (!rpc || rpc === "NEEDS_CONFIRM") {
        setErr("Network RPC unavailable.");
        return;
      }
      setBusy(true);
      const result = await addUserTokenByAddress(chain.id, rpc, q);
      setBusy(false);
      if (result.ok) {
        addWatchedToken(chain.id, result.record.address);
        pushToast({ title: "Token added", body: `${result.record.symbol} on ${chain.name}`, tone: "success" });
        setQuery("");
      } else {
        setErr(result.message);
      }
      return;
    }
    setBusy(true);
    const found = await searchListedTokens(chain.id, q, 12);
    setBusy(false);
    setResults(found);
    if (!found.length) setErr("No listed tokens matched. Paste a contract address to add manually.");
  }, [query, chain, rpc, pushToast]);

  const addListed = async (token: ListedToken) => {
    if (!chain || !rpc || rpc === "NEEDS_CONFIRM") return;
    const registry = chain.tokens.find((t) => t.symbol.toUpperCase() === token.symbol.toUpperCase());
    if (isSettlementMetaChain(chain.id) && registry && registry.standard !== "erc20") {
      pushToast({
        title: "Already in catalog",
        body: `${token.symbol} is tokenized via Nova settlement meta on ${chain.name}.`,
        tone: "success",
      });
      setResults([]);
      setQuery("");
      return;
    }
    setBusy(true);
    const result = await addUserTokenByAddress(chain.id, rpc, token.address);
    setBusy(false);
    if (result.ok) {
      addWatchedToken(chain.id, result.record.address);
      pushToast({ title: "Token added", body: `${result.record.symbol} on ${chain.name}`, tone: "success" });
      setResults([]);
      setQuery("");
    } else {
      setErr(result.message);
    }
  };

  if (!enabledChains.length) {
    return <p className="text-sm text-signet-muted">Enable a network to search tokens.</p>;
  }

  return (
    <div className="glass-card space-y-3 p-4">
      <h3 className="font-heading text-sm font-semibold text-signet-text">Search tokens</h3>
      <p className="text-xs text-signet-muted">Search by name or symbol, or paste a contract address (0x…).</p>
      <select
        className="w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-surface px-3 text-sm"
        value={chainId}
        onChange={(e) => setChainId(Number(e.target.value))}
      >
        {enabledChains.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.id})
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="text"
          className="min-h-[44px] flex-1 rounded-xl border border-signet-border bg-signet-surface px-3 text-sm"
          placeholder="USDC, WETH, or 0x…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void runSearch()}
        />
        <button type="button" className="btn-secondary shrink-0 px-4" disabled={busy || !query.trim()} onClick={() => void runSearch()}>
          {busy ? "…" : "Search"}
        </button>
      </div>
      {err && <p className="text-xs text-signet-danger">{err}</p>}
      {results.length > 0 && (
        <ul className="divide-y divide-signet-border rounded-xl border border-signet-border">
          {results.map((t) => (
            <li key={`${t.symbol}-${t.address}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-signet-surface"
                onClick={() => void addListed(t)}
              >
                <span className="text-sm font-medium text-signet-text">{t.symbol}</span>
                <span className="truncate text-xs text-signet-muted">{t.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
