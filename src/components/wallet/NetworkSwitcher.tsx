import { useMemo, useState } from "react";
import { useWalletContext } from "../../context/WalletContext";
import { useEnabledChains } from "../../hooks/useEnabledChains";
import { getAllChains } from "../../lib/networks";
import { DropdownPanel } from "../common/DropdownPanel";

function resolveChain(id: number) {
  return getAllChains().find((c) => c.id === id);
}

export function NetworkSwitcher(): JSX.Element {
  const { chainId, setChainId } = useWalletContext();
  const { enabledChains } = useEnabledChains();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const active = resolveChain(chainId);

  const options = useMemo(() => {
    const ids = new Set<number>();
    const list = [...enabledChains];
    if (active && !list.some((c) => c.id === active.id)) {
      list.unshift(active);
    }
    return list.filter((c) => {
      if (ids.has(c.id)) return false;
      ids.add(c.id);
      return true;
    });
  }, [enabledChains, active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.id).includes(q) ||
        c.nativeCurrency.symbol.toLowerCase().includes(q),
    );
  }, [options, query]);

  const pick = (id: number) => {
    setChainId(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <DropdownPanel
      open={open}
      onClose={() => {
        setOpen(false);
        setQuery("");
      }}
      widthClass="w-80"
      trigger={({ expanded, controlId }) => (
        <button
          type="button"
          id={controlId}
          aria-expanded={expanded}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="flex max-w-[140px] min-h-[36px] items-center gap-1.5 rounded-full border border-signet-border bg-signet-surface px-3 text-xs text-signet-ink transition hover:border-signet-gold/40 sm:max-w-[180px]"
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: active?.iconColor ?? "#C9A84C" }}
          />
          <span className="truncate">{active?.name ?? `Chain ${chainId}`}</span>
          <span className="text-[10px] text-signet-muted">{expanded ? "▴" : "▾"}</span>
        </button>
      )}
    >
      <div className="border-b border-signet-border p-2">
        <input
          type="search"
          placeholder="Search chains…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full min-h-[36px] rounded-lg border border-signet-border bg-signet-surface px-3 text-xs text-signet-text outline-none focus:border-signet-gold/50"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-signet-muted">
          No enabled networks match. Enable chains in Settings → Network.
        </p>
      ) : (
        <ul className="py-1">
          {filtered.map((chain) => {
            const selected = chain.id === chainId;
            const locked =
              chain.isInternal || !chain.rpcUrls.length || chain.rpcUrls.includes("NEEDS_CONFIRM");
            return (
              <li key={chain.id}>
                <button
                  type="button"
                  role="menuitem"
                  disabled={locked}
                  onClick={() => pick(chain.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs transition ${
                    selected ? "bg-signet-gold/10 text-signet-gold" : "text-signet-text hover:bg-signet-surface"
                  } ${locked ? "cursor-not-allowed opacity-45" : ""}`}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: chain.iconColor }} />
                  <span className="min-w-0 flex-1 truncate font-medium">{chain.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-signet-muted">{chain.id}</span>
                  {selected && <span className="text-signet-gold">✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </DropdownPanel>
  );
}
