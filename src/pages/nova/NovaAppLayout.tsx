import { NavLink, Navigate, Outlet } from "react-router-dom";
import { NOVA_PRODUCT_CONTACT_EMAIL } from "../../lib/brand";
import { paths } from "../../lib/routes";
import { useNovaBank } from "../../context/NovaBankContext";

const tabs = [
  { to: paths.novaApp, label: "Bank", end: true },
  { to: paths.novaTransfer, label: "Transfer" },
  { to: paths.novaSwap, label: "Swap" },
  { to: paths.novaCards, label: "Cards" },
];

export function NovaAppLayout(): JSX.Element {
  const { ready, user, logout } = useNovaBank();
  if (!ready) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-signet-bg text-sm text-signet-muted">Loading Nova Online Bank…</div>;
  }
  if (!user) return <Navigate to={paths.novaLogin} replace />;

  return (
    <div className="min-h-[100dvh] bg-signet-bg text-signet-text">
      <header className="border-b border-signet-border bg-signet-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-signet-gold-muted">Nova Online Bank</p>
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
        <p className="mb-4 rounded-xl border border-signet-gold/30 bg-signet-gold/10 px-3 py-2 text-xs text-signet-text">
          Live Nova Online Bank funds. Transfers and card actions post to the production ledger.
        </p>
        <Outlet />
        <p className="pb-6 pt-8 text-center text-[11px] text-signet-muted">
          Nova X ·{" "}
          <a className="text-signet-gold" href={`mailto:${NOVA_PRODUCT_CONTACT_EMAIL}`}>
            {NOVA_PRODUCT_CONTACT_EMAIL}
          </a>
        </p>
      </main>
    </div>
  );
}
