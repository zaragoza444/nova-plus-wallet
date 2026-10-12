import { Link } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";

interface SettingsComingSoonProps {
  title: string;
  description: string;
}

export function SettingsComingSoon({ title, description }: SettingsComingSoonProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading text-base font-semibold text-signet-text">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-signet-muted">{description}</p>
      </div>
      <EmptyState icon="⚙" title="Coming soon" description={`${title} preferences will ship in a future Nova+ release.`} />
      <Link to="/app/settings/network" className="tap-target inline-flex text-sm text-signet-gold underline">
        Network settings are available now →
      </Link>
    </div>
  );
}
