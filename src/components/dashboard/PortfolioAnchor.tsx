import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Skeleton } from "../common/Skeleton";
import { formatFiatEstimate, type DisplayCurrency } from "../../lib/settings";

interface PortfolioAnchorProps {
  totalUsd: number;
  displayCurrency: DisplayCurrency;
  loading?: boolean;
  changePct?: string | null;
}

function PortfolioSparkline({ totalUsd }: { totalUsd: number }): JSX.Element {
  const data = useMemo(() => {
    const points = 24;
    const base = totalUsd > 0 ? totalUsd * 0.92 : 1000;
    const range = totalUsd > 0 ? totalUsd * 0.08 : 400;
    return Array.from({ length: points }, (_, i) => ({
      t: i,
      v: base + Math.sin(i / 4) * range * 0.5 + (i / points) * range * 0.5,
    }));
  }, [totalUsd]);

  return (
    <div className="h-16 w-full opacity-90">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioSparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke="#C9A84C"
            strokeWidth={1.5}
            fill="url(#portfolioSparkGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PortfolioAnchor({
  totalUsd,
  displayCurrency,
  loading,
  changePct,
}: PortfolioAnchorProps): JSX.Element {
  if (loading) {
    return (
      <section className="glass-card-glow portfolio-anchor relative overflow-hidden p-6 reveal reveal-1" aria-busy="true">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="mt-3 h-11 w-52" />
        <Skeleton className="mt-4 h-16 w-full rounded-xl" />
      </section>
    );
  }

  return (
    <section className="glass-card-glow portfolio-anchor relative overflow-hidden p-6 reveal reveal-1">
      <div className="portfolio-anchor-shimmer pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <p className="relative text-[11px] font-medium uppercase tracking-widest text-signet-muted">
        Total Portfolio
      </p>
      <div className="relative mt-1 flex items-baseline gap-2">
        <p className="portfolio-value font-heading text-[clamp(2rem,5vw,2.75rem)] font-bold leading-none tracking-tight">
          {formatFiatEstimate(totalUsd, displayCurrency)}
        </p>
        {changePct && (
          <span className="text-xs font-medium tabular-nums text-signet-verdant">{changePct}</span>
        )}
      </div>
      <div className="relative mt-3">
        <PortfolioSparkline totalUsd={totalUsd} />
      </div>
    </section>
  );
}
