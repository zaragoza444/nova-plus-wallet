import { useState, type ReactNode } from "react";
import { useToast } from "../../context/ToastContext";
import { useWalletContext } from "../../context/WalletContext";
import { useEnabledChains } from "../../hooks/useEnabledChains";
import type { ChainDef } from "../../lib/chains";
import { validateUserChainInput, validateChainRpc } from "../../lib/networks";
import { InstitutionalGatePrompt } from "../../components/security/InstitutionalGatePrompt";
import { SearchTokens } from "../../components/tokens/SearchTokens";

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-signet-gold" : "bg-signet-border"
      } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-signet-text shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ChainDot({ color }: { color: string }): JSX.Element {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />;
}

function ChainRow({
  chain,
  trailing,
  burgundy,
}: {
  chain: ChainDef;
  trailing: JSX.Element;
  burgundy?: boolean;
}): JSX.Element {
  const lockedRpc = !chain.rpcUrls.length || chain.rpcUrls.includes("NEEDS_CONFIRM");
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3.5 ${burgundy ? "bg-signet-burgundy-soft/30" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ChainDot color={chain.iconColor} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-signet-text">{chain.name}</p>
          <p className="font-mono text-[11px] text-signet-muted">
            {chain.id} · {chain.nativeCurrency.symbol}
            {lockedRpc && " · RPC unavailable"}
          </p>
        </div>
      </div>
      {trailing}
    </div>
  );
}

function TierSection({
  title,
  hint,
  burgundy,
  children,
}: {
  title: string;
  hint?: string;
  burgundy?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-2">
      <div>
        <h4 className={`text-sm font-semibold ${burgundy ? "text-signet-burgundy-bright" : "text-signet-text"}`}>
          {title}
        </h4>
        {hint && <p className="mt-0.5 text-[11px] text-signet-muted">{hint}</p>}
      </div>
      <div
        className={`glass-card divide-y divide-signet-border overflow-hidden ${
          burgundy ? "border border-signet-burgundy-muted/30" : ""
        }`}
      >
        {children}
      </div>
    </section>
  );
}

function StatusBadge({ tone, children }: { tone: "active" | "locked"; children: ReactNode }): JSX.Element {
  const cls =
    tone === "active"
      ? "border-signet-verdant/30 bg-signet-verdant-soft text-signet-verdant"
      : "border-signet-border bg-signet-surface text-signet-muted";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  );
}

function chainToggleTrailing(
  chain: ChainDef,
  isEnabled: (id: number) => boolean,
  toggle: (id: number) => void,
): JSX.Element {
  const lockedRpc = !chain.rpcUrls.length || chain.rpcUrls.includes("NEEDS_CONFIRM");
  if (chain.isInternal || lockedRpc) {
    return <StatusBadge tone="locked">{chain.isInternal ? "Tunnel required" : "Unavailable"}</StatusBadge>;
  }
  if (chain.isDefault) {
    return <StatusBadge tone="active">Active</StatusBadge>;
  }
  return (
    <Toggle checked={isEnabled(chain.id)} label={`Toggle ${chain.name}`} onChange={() => toggle(chain.id)} />
  );
}

const EMPTY_FORM = { id: "", name: "", rpcUrl: "", symbol: "", decimals: "18", explorer: "" };

export function SettingsNetworkPage(): JSX.Element {
  const { pushToast } = useToast();
  const { isInstitutional, gateUnlocked } = useWalletContext();
  const {
    defaultTier,
    partnerChains,
    publicEvm,
    worldChains,
    privateBanking,
    internalMesh,
    customChains,
    isEnabled,
    toggle,
    addCustom,
    removeCustom,
  } = useEnabledChains();

  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [validating, setValidating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const publicAnaka = publicEvm.filter((c) => c.tier === "public");

  const handleAddCustom = async () => {
    setFormError(null);
    const result = validateUserChainInput(form);
    if (result.ok === false) {
      setFormError(result.message);
      return;
    }
    setValidating(true);
    const rpcCheck = await validateChainRpc(result.record.rpcUrl, result.record.id);
    setValidating(false);
    if (rpcCheck.ok === false) {
      setFormError(rpcCheck.message);
      return;
    }
    try {
      addCustom(result.record);
      setForm(EMPTY_FORM);
      setFormError(null);
      setShowForm(false);
      pushToast({ title: "Network added", body: result.record.name, tone: "success" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      setFormError(message);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h3 className="font-heading text-lg font-semibold text-signet-text">Network</h3>
        <p className="mt-1 text-sm text-signet-muted">
          Choose which chains Signet reads balances from. Banking layers require Private Access.
        </p>
      </div>

      {defaultTier.length > 0 && (
        <TierSection title="Default networks" hint="Core mesh defaults — active when RPC is reachable.">
          {defaultTier.map((chain) => (
            <ChainRow
              key={chain.id}
              chain={chain}
              trailing={chainToggleTrailing(chain, isEnabled, toggle)}
            />
          ))}
        </TierSection>
      )}

      {partnerChains.length > 0 && (
        <TierSection title="Partner networks" hint="Defi Oracle, ALLTRA, NRW, OneX — toggle when RPC is confirmed.">
          {partnerChains.map((chain) => (
            <ChainRow
              key={chain.id}
              chain={chain}
              trailing={chainToggleTrailing(chain, isEnabled, toggle)}
            />
          ))}
        </TierSection>
      )}

      {publicAnaka.length > 0 && (
        <TierSection title="AnakaChain (public)" hint="Public-facing Anakatech settlement layer.">
          {publicAnaka.map((chain) => (
            <ChainRow
              key={chain.id}
              chain={chain}
              trailing={chainToggleTrailing(chain, isEnabled, toggle)}
            />
          ))}
        </TierSection>
      )}

      {worldChains.length > 0 && (
        <TierSection title="World chains" hint="Top EVM networks from chainid.network — off by default.">
          {worldChains.map((chain) => (
            <ChainRow
              key={chain.id}
              chain={chain}
              trailing={chainToggleTrailing(chain, isEnabled, toggle)}
            />
          ))}
        </TierSection>
      )}

      {customChains.length > 0 && (
        <TierSection
          title="Private banking"
          hint="AnakaChain banking mesh + NovaOne — visible after Private Access unlock."
          burgundy
        >
          {!gateUnlocked ? (
            <div className="p-4">
              <InstitutionalGatePrompt />
            </div>
          ) : privateBanking.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-signet-muted">No private banking chains configured.</p>
          ) : (
            privateBanking.map((chain) => (
              <ChainRow
                key={chain.id}
                chain={chain}
                burgundy
                trailing={chainToggleTrailing(chain, isEnabled, toggle)}
              />
            ))
          )}
        </TierSection>
      )}

      {customChains.length > 0 && (
        <TierSection title="Custom networks" hint="User-added RPC endpoints.">
          {customChains.map((chain) => (
            <ChainRow
              key={chain.id}
              chain={chain}
              trailing={
                <div className="flex items-center gap-2">
                  <Toggle
                    checked={isEnabled(chain.id)}
                    label={`Toggle ${chain.name}`}
                    onChange={() => toggle(chain.id)}
                  />
                  <button
                    type="button"
                    className="min-h-[32px] rounded-lg border border-signet-border px-2 text-[11px] text-signet-muted transition hover:border-signet-danger/40 hover:text-signet-danger"
                    onClick={() => {
                      removeCustom(chain.id);
                      pushToast({ title: "Network removed", body: chain.name, tone: "info" });
                    }}
                  >
                    Remove
                  </button>
                </div>
              }
            />
          ))}
        </TierSection>
      )}

      {internalMesh.length > 0 && (
        <TierSection title="Internal mesh" hint="LAN / localhost layers — not reachable from the browser without a tunnel.">
          {internalMesh.map((chain) => (
            <ChainRow
              key={chain.id}
              chain={chain}
              trailing={<StatusBadge tone="locked">Tunnel required</StatusBadge>}
            />
          ))}
        </TierSection>
      )}

      <SearchTokens />

      <section className="space-y-3">
        {!showForm ? (
          <button
            type="button"
            className="w-full min-h-[48px] rounded-xl border border-dashed border-signet-gold/40 bg-signet-gold-dim/10 text-sm font-semibold text-signet-gold transition hover:border-signet-gold/60 hover:bg-signet-gold-dim/20"
            onClick={() => setShowForm(true)}
          >
            + Add custom network
          </button>
        ) : (
          <div className="glass-card space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-signet-text">Add custom network</h4>
              <button
                type="button"
                className="text-[11px] text-signet-muted hover:text-signet-text"
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-1">
                <span className="text-[11px] font-medium text-signet-muted">Chain ID</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-3 font-mono text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={form.id}
                  onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                  placeholder="8453"
                />
              </label>
              <label className="block sm:col-span-1">
                <span className="text-[11px] font-medium text-signet-muted">Network name</span>
                <input
                  type="text"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-3 text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="My Network"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-medium text-signet-muted">RPC URL</span>
                <input
                  type="url"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-3 font-mono text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={form.rpcUrl}
                  onChange={(e) => setForm((f) => ({ ...f, rpcUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-signet-muted">Native symbol</span>
                <input
                  type="text"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-3 font-mono text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                  placeholder="ETH"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-signet-muted">Decimals</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-3 font-mono text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={form.decimals}
                  onChange={(e) => setForm((f) => ({ ...f, decimals: e.target.value }))}
                  placeholder="18"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-medium text-signet-muted">Block explorer (optional)</span>
                <input
                  type="url"
                  className="mt-1.5 w-full min-h-[44px] rounded-xl border border-signet-border bg-signet-bg px-3 font-mono text-sm text-signet-text focus:border-signet-gold/50 focus:outline-none"
                  value={form.explorer}
                  onChange={(e) => setForm((f) => ({ ...f, explorer: e.target.value }))}
                  placeholder="https://explorer.example.com"
                />
              </label>
            </div>

            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-signet-danger/40 bg-signet-danger-soft px-3 py-2.5 text-sm text-signet-danger"
              >
                {formError}
              </div>
            )}

            <button
              type="button"
              className="w-full min-h-[48px] rounded-xl bg-signet-gold text-sm font-semibold text-black transition hover:bg-signet-gold-light disabled:opacity-60"
              disabled={validating}
              onClick={() => void handleAddCustom()}
            >
              {validating ? "Validating RPC…" : "Save network"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
