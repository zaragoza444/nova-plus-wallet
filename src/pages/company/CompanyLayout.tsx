import { NavLink, Outlet } from "react-router-dom";
import { SignetLogo } from "../../components/layout/SignetLogo";
import { company } from "../../lib/company";
import { paths } from "../../lib/routes";

const navLink =
  "text-sm text-signet-muted no-underline transition hover:text-signet-text";

export function CompanyLayout(): JSX.Element {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-signet-bg text-signet-text grain-overlay">
      <header className="sticky top-0 z-40 border-b border-signet-border bg-signet-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <NavLink to={paths.company} className="flex min-h-[44px] items-center gap-2.5 no-underline">
            <SignetLogo variant="mark" className="h-8 w-8" alt={company.displayName} />
            <span className="font-heading text-sm font-semibold tracking-tight text-signet-text sm:hidden">
              {company.shortName}
            </span>
            <span className="hidden font-heading text-sm font-semibold tracking-tight text-signet-text sm:inline">
              {company.displayName}
            </span>
          </NavLink>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
            <NavLink to={paths.company} end className={navLink}>
              Products
            </NavLink>
            <NavLink to={paths.companyAbout} className={navLink}>
              Company
            </NavLink>
            <NavLink to={paths.companyContact} className={navLink}>
              Contact
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 md:px-6 md:py-14">
        <Outlet />
      </main>

      <footer className="border-t border-signet-border pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-xs text-signet-muted md:flex-row md:items-center md:justify-between md:px-6">
          <p>
            {company.legalName} · {company.number}
          </p>
          <p>
            Incorporated {company.incorporated} · {company.jurisdiction}
          </p>
          <a className="text-signet-gold no-underline" href={`mailto:${company.email}`}>
            {company.email}
          </a>
        </div>
      </footer>
    </div>
  );
}
