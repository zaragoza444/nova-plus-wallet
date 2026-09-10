import { Link } from "react-router-dom";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";
import { paths } from "../lib/routes";

const links: { to: string; label: string; icon: string; hint: string }[] = [
  { to: paths.tokens, label: "Tokens", icon: "₿", hint: "All token balances" },
  { to: paths.assets, label: "Assets", icon: "🏛", hint: "ATKSH & property" },
  { to: paths.banks, label: "Banks", icon: "🏦", hint: "OneX Bank + institutional directory" },
  { to: paths.onex, label: "OneX Bank", icon: "✕", hint: "Online bank · swap · chain 138" },
  { to: paths.bridge, label: "Bridge", icon: "⛓", hint: "Cross-chain mesh" },
  { to: paths.importWallet, label: "Import wallet", icon: "🔑", hint: "Private key → Signet" },
  { to: paths.settingsAccounts, label: "Settings", icon: "⚙", hint: "Accounts & security" },
];

export function MorePage(): JSX.Element {
  return (
    <PageShell width="lg">
      <PageHeader
        eyebrow="More"
        title="Explore"
        description="Access all Signet features from one place."
      />

      <div className="space-y-2 reveal reveal-1">
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="tap-target flex min-h-[44px] items-center gap-4 rounded-2xl border border-signet-border bg-signet-surface px-4 py-4 transition-all hover:border-signet-gold/30 hover:shadow-gold-sm active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signet-bg text-lg">
              {l.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-signet-text">{l.label}</p>
              <p className="text-[11px] text-signet-muted">{l.hint}</p>
            </div>
            <span className="text-signet-muted">→</span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
