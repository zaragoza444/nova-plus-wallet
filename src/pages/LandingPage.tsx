import { Link } from "react-router-dom";
import { paths } from "../lib/routes";
import { brand, brandLogoUrl, brandProductName, brandTagline } from "../lib/brand";
import { SignetLogo, SignetWordmark } from "../components/layout/SignetLogo";

export function LandingPage(): JSX.Element {
  const hasWordmark = Boolean(brand.wordmarkUrl);
  const hasPackLogo = Boolean(brandLogoUrl(false));
  const name = brandProductName();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-signet-bg px-6 py-10 text-center text-signet-ink grain-overlay">
      <div className="reveal w-full max-w-md">
        {hasWordmark ? (
          <SignetWordmark className="mx-auto mb-8 h-11" />
        ) : hasPackLogo ? (
          <SignetLogo variant="logo" className="mx-auto mb-8 h-16 w-auto max-w-[240px]" />
        ) : (
          <div className="mb-6">
            <SignetLogo variant="mark" className="mx-auto mb-4 h-16 w-16" />
            <h1 className="font-display text-4xl font-semibold tracking-wide gold-text">{name}</h1>
          </div>
        )}
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-signet-muted">{brandTagline()}</p>
        <Link
          to={paths.home}
          className="btn-primary mx-auto mt-8 inline-flex min-w-[200px] px-10 text-base no-underline shadow-gold-md"
        >
          Open Wallet
        </Link>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {["AnakaChain", "Partner nets", "World chains"].map((c) => (
            <span
              key={c}
              className="rounded-full border border-signet-border-glow bg-signet-surface/80 px-3 py-1 text-[11px] text-signet-muted"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
