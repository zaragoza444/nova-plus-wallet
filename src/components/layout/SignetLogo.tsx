import { brandLogoUrl, brandMarkUrl } from "../../lib/brand";

type SignetLogoProps = {
  className?: string;
  /** Use wordmark when available (headers, landing). */
  variant?: "mark" | "logo" | "wordmark";
  alt?: string;
};

function FallbackMark({ className }: { className?: string }): JSX.Element {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id="signet-gold" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C9A84C" />
          <stop offset="0.5" stopColor="#E8D48B" />
          <stop offset="1" stopColor="#C9A84C" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#111118" stroke="url(#signet-gold)" strokeWidth="1.2" />
      <path d="M16 8l6 8-6 8-6-8 6-8z" fill="url(#signet-gold)" />
    </svg>
  );
}

export function SignetLogo({
  className = "h-8 w-8",
  variant = "mark",
  alt = "Nova Plus Wallet",
}: SignetLogoProps): JSX.Element {
  const wordmark = brandLogoUrl(true);
  const logo = brandLogoUrl(false);
  const mark = brandMarkUrl();

  let src: string | null = null;
  if (variant === "wordmark") src = wordmark ?? logo ?? mark;
  else if (variant === "logo") src = logo ?? mark ?? wordmark;
  else src = mark ?? logo;

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`object-contain ${variant === "wordmark" ? "h-8 w-auto max-w-[160px]" : className}`}
        draggable={false}
      />
    );
  }

  return <FallbackMark className={className} />;
}

export function SignetWordmark({ className = "h-8" }: { className?: string }): JSX.Element {
  return <SignetLogo variant="wordmark" className={className} alt="Nova Plus Wallet" />;
}
