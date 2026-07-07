import { AssetList } from "../components/assets/AssetList";
import { SearchTokens } from "../components/tokens/SearchTokens";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";

export function Assets(): JSX.Element {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Assets"
        title="Tokenised assets"
        description="ATKSH shares and PROP positions on the Anakatech asset layer."
      />
      <div className="reveal reveal-1 space-y-6">
        <AssetList />
        <SearchTokens />
      </div>
    </PageShell>
  );
}
