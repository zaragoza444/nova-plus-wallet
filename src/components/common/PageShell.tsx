import type { ReactNode } from "react";

const WIDTH: Record<string, string> = {
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  full: "max-w-5xl",
};

interface PageShellProps {
  children: ReactNode;
  width?: keyof typeof WIDTH;
  className?: string;
}

export function PageShell({ children, width = "3xl", className = "" }: PageShellProps): JSX.Element {
  return (
    <div className={`page-shell mx-auto ${WIDTH[width] ?? WIDTH["3xl"]} ${className}`.trim()}>{children}</div>
  );
}
