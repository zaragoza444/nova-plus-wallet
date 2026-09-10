import { Link } from "react-router-dom";
import { useWalletContext } from "../context/WalletContext";
import { DEFAULT_BANKS, type BankConfig } from "../lib/keystore";
import { InstitutionalGatePrompt } from "../components/security/InstitutionalGatePrompt";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";

function isInternalBankUrl(url: string): boolean {
  return url.startsWith("#/") || url.startsWith("/");
}

function BankRow({ bank }: { bank: BankConfig }): JSX.Element {
  const pending = !bank.url;
  if (pending) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-signet-border px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signet-burgundy-soft text-sm font-bold text-signet-burgundy-bright">
            {bank.initial}
          </span>
          <div>
            <p className="text-sm font-semibold text-signet-text">{bank.name}</p>
            <p className="text-xs text-signet-muted">Link pending</p>
          </div>
        </div>
        <span className="rounded-full border border-signet-border px-2 py-0.5 text-[10px] uppercase text-signet-muted">
          NEEDS_CONFIRM
        </span>
      </div>
    );
  }
  const className =
    "flex items-center justify-between gap-3 rounded-xl border border-signet-burgundy-muted/30 bg-signet-burgundy-soft/50 px-4 py-3.5 transition hover:border-signet-burgundy-muted no-underline";
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-signet-burgundy text-sm font-bold text-white">
          {bank.initial}
        </span>
        <div>
          <p className="text-sm font-semibold text-signet-text">{bank.name}</p>
          {bank.id === "onexbank" && <p className="text-xs text-signet-muted">Live · same rails as Nova Online Bank</p>}
        </div>
      </div>
      <span className="text-signet-burgundy-bright">→</span>
    </>
  );
  if (isInternalBankUrl(bank.url!)) {
    const to = bank.url!.replace(/^#/, "");
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={bank.url!} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  );
}

export function BanksDirectory(): JSX.Element {
  const { isInstitutional, gateUnlocked } = useWalletContext();
  const onex = DEFAULT_BANKS.filter((b) => b.id === "onexbank");
  const others = DEFAULT_BANKS.filter((b) => b.id !== "onexbank");

  if (!isInstitutional) {
    return (
      <PageShell>
        <PageHeader
          eyebrow="Banks"
          title="OneX Bank"
          description="OneX Online Bank is open for every wallet. Other private banks stay institutional."
        />
        <div className="space-y-3">
          {onex.map((bank) => (
            <BankRow key={bank.id} bank={bank} />
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Institutional"
        title="Banks"
        description="OneX Bank is live. Other private destinations appear when configured."
      />
      {!gateUnlocked ? (
        <>
          <div className="space-y-3">
            {onex.map((bank) => (
              <BankRow key={bank.id} bank={bank} />
            ))}
          </div>
          <InstitutionalGatePrompt />
        </>
      ) : (
        <div className="space-y-3">
          {[...onex, ...others].map((bank) => (
            <BankRow key={bank.id} bank={bank} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
