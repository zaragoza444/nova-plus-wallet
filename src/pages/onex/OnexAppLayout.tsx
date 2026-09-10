import { NavLink, Navigate, Outlet } from "react-router-dom";
import { paths } from "../../lib/routes";
import { useOnexBank } from "../../context/OnexBankContext";

const tabs = [
  { to: paths.onexApp, label: "Bank", end: true },
  { to: paths.onexTransfer, label: "Transfer" },
  { to: paths.onexSwap, label: "Swap" },
  { to: paths.onexChain, label: "Chain" },
  { to: paths.onexCards, label: "Cards" },
];

export function OnexAppLayout(): JSX.Element {
  const { ready, user, logout } = useOnexBank();
  if (!ready) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-signet-bg text-sm text-signet-muted">Loading OneX Bank…</div>;
  }
  if (!user) return <Navigate to={paths.onexLogin} replace />;

  return (
    <div className="min-h-[100dvh] bg-signet-bg text-signet-text">
      <header className="border-b border-signet-border bg-signet-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted">OneX Online Bank</p>
            <p className="text-sm font-semibold">{user.fullName}</p>
          </div>
          <nav className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `rounded-full px-3 py-1.5 text-xs font-medium ${isActive ? "bg-signet-gold/15 text-signet-gold" : "text-signet-muted hover:text-signet-text"}`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <button type="button" onClick={() => void logout()} className="text-xs text-signet-muted hover:text-signet-gold">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
