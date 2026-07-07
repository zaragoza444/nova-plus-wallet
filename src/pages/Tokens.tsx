import { ConnectWallet } from "../components/wallet/ConnectWallet";
import { TokenList } from "../components/tokens/TokenList";
import { AddTokenForm } from "../components/tokens/AddTokenForm";
import { SearchTokens } from "../components/tokens/SearchTokens";
import { ManageHiddenTokens } from "../components/tokens/ManageHiddenTokens";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";
import { useWalletContext } from "../context/WalletContext";

export function Tokens(): JSX.Element {
  const { address } = useWalletContext();
  if (!address) return <ConnectWallet />;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Tokens"
        title="All tokens"
        description="Multi-chain balances with live pricing. Refreshes every 15 seconds."
      />
      <div className="space-y-6">
        <div className="reveal reveal-1">
          <TokenList address={address} />
        </div>
        <div className="reveal reveal-2 space-y-4">
          <SearchTokens />
          <AddTokenForm />
        </div>
        <section className="reveal reveal-3 space-y-3">
          <div>
            <h2 className="font-heading text-sm font-semibold text-signet-text">Hidden tokens</h2>
            <p className="mt-1 text-xs text-signet-muted">
              Tokens you hid from the list. Unhide to show them again in portfolio and send flows.
            </p>
          </div>
          <ManageHiddenTokens />
        </section>
      </div>
    </PageShell>
  );
}
