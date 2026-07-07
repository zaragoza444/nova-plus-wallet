import { Link, Outlet, useLocation } from "react-router-dom";
import { paths } from "../../lib/routes";

const items = [
  { to: paths.settingsAccounts, label: "Accounts", icon: "👤" },
  { to: paths.settingsGeneral, label: "General", icon: "⚙" },
  { to: paths.settingsSecurity, label: "Security", icon: "🔐" },
  { to: paths.settingsBackup, label: "Backup", icon: "💾" },
  { to: paths.settingsNetwork, label: "Network", icon: "🌐" },
  { to: paths.settingsNotifications, label: "Notifications", icon: "🔔" },
  { to: paths.settingsDisplay, label: "Display", icon: "🎨" },
  { to: paths.settingsConnections, label: "Connections", icon: "🔗" },
  { to: paths.settingsAdvanced, label: "Advanced", icon: "⚡" },
  { to: paths.settingsFafo, label: "FAFO", icon: "🔥" },
  { to: paths.settingsAbout, label: "About", icon: "ℹ" },
];

export function SettingsLayout(): JSX.Element {
  const loc = useLocation();
  return (
    <div className="page-shell mx-auto max-w-3xl">
      <header>
        <h2 className="font-heading text-xl font-bold tracking-tight text-signet-text">Settings</h2>
        <p className="mt-1 text-sm text-signet-muted">Wallet, networks, and display preferences.</p>
      </header>
      <nav className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" aria-label="Settings sections">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`tap-target shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              loc.pathname === item.to
                ? "border-signet-gold/40 bg-signet-gold/10 text-signet-gold"
                : "border-signet-border bg-signet-surface text-signet-muted hover:text-signet-text"
            }`}
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>
      <div className="glass-card p-5">
        <Outlet />
      </div>
    </div>
  );
}
