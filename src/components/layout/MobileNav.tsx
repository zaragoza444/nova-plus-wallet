import { NavLink } from "react-router-dom";
import { paths } from "../../lib/routes";

const base =
  "flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium leading-tight transition-colors duration-200";

function Tab({ to, end, label, icon }: { to: string; end?: boolean; label: string; icon: string }): JSX.Element {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${base} ${isActive ? "text-signet-gold" : "text-signet-muted hover:text-signet-ink"}`
      }
    >
      <span className="text-xl leading-none" aria-hidden>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export function MobileNav(): JSX.Element {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-signet-border bg-signet-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1.5 pt-1.5">
        <Tab to={paths.home} end label="Home" icon="⌂" />
        <Tab to={paths.send} label="Send" icon="↑" />
        <Tab to={paths.receive} label="Receive" icon="↓" />
        <Tab to={paths.swap} label="Swap" icon="⇄" />
        <Tab to={paths.more} label="More" icon="≡" />
      </div>
    </nav>
  );
}
