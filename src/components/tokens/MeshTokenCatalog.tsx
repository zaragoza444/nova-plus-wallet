import { useMemo, useState } from "react";
import { getChain } from "../../lib/chains";
import { SETTLEMENT_META_CHAIN_IDS } from "../../lib/settlement-meta";

function kindLabel(standard: string | undefined, tokenized?: boolean): string {
  if (standard === "native") return "Native";
  if (standard === "erc20") return "ERC-20 wrap";
  if (tokenized) return "Tokenized meta";
  return "Meta";
}

export function MeshTokenCatalog(): JSX.Element {
  const [chainId, setChainId] = useState<number>(22016);
  const chain = getChain(chainId);
  const tokens = chain?.tokens ?? [];

  const counts = useMemo(() => {
    const native = tokens.filter((t) => t.standard === "native").length;
    const erc20 = tokens.filter((t) => t.standard === "erc20").length;
    const meta = tokens.filter((t) => t.standard === "meta").length;
    return { native, erc20, meta, total: tokens.length };
  }, [tokens]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-sm font-semibold text-signet-text">
          NovaONE &amp; NRW World catalog
        </h2>
        <p className="mt-1 text-xs text-signet-muted">
          {counts.total} imported assets on {chain?.name}. Liquidity is Nova settlement meta (m2)
          for both chains. Local ERC-20 balance reads use the wrapped-bridge contract only.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SETTLEMENT_META_CHAIN_IDS.map((id) => {
          const c = getChain(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => setChainId(id)}
              className={`min-h-[40px] rounded-xl border px-3.5 text-sm font-medium ${
                chainId === id
                  ? "border-signet-gold bg-signet-gold/10 text-signet-gold"
                  : "border-signet-border text-signet-muted hover:text-signet-text"
              }`}
            >
              {c?.name ?? id} ({id})
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-signet-muted">
        {counts.native} native · {counts.erc20} on-chain wrap · {counts.meta} tokenized via settlement meta
      </p>
      <div className="glass-card max-h-[420px] overflow-auto divide-y divide-signet-border">
        {tokens.map((t) => (
          <div key={`${chainId}-${t.symbol}`} className="flex items-start justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-signet-text">{t.symbol}</p>
              <p className="truncate text-[11px] text-signet-muted">{t.name}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-medium text-signet-gold">{kindLabel(t.standard, t.tokenized)}</p>
              {t.tokenizedAddress && (
                <p className="max-w-[140px] truncate font-mono text-[10px] text-signet-muted">
                  {t.tokenizedAddress}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
