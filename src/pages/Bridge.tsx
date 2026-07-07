import { BridgePanel } from "../components/bridge/BridgePanel";
import { BridgeHistory } from "../components/bridge/BridgeHistory";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";
import { AIInsight } from "../components/common/AIInsight";
import { INSIGHTS } from "../lib/insights";

export function Bridge(): JSX.Element {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Bridge"
        title="Cross-chain bridge"
        description="Lock or burn on the source portal; mesh relayers mint or release on the destination."
      />
      <AIInsight {...INSIGHTS.bridge} className="reveal reveal-1" />
      <div className="reveal reveal-1">
        <BridgePanel />
      </div>
      <div className="reveal reveal-2">
        <BridgeHistory />
      </div>
    </PageShell>
  );
}
