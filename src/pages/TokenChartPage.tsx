import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "../components/common/PageHeader";
import { PageShell } from "../components/common/PageShell";
import { CardSkeleton } from "../components/common/Skeleton";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { AIInsight } from "../components/common/AIInsight";
import { fetchCoinGeckoMarketChart, type ChartPoint } from "../lib/prices";
import { paths } from "../lib/routes";
import { INSIGHTS } from "../lib/insights";

function formatAxisDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatPrice(v: number): string {
  return v.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: v < 1 ? 4 : 2,
  });
}

export function TokenChartPage(): JSX.Element {
  const { coingeckoId } = useParams();
  const [searchParams] = useSearchParams();
  const symbol = searchParams.get("symbol") ?? coingeckoId ?? "Token";
  const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? 7) || 7));

  const [points, setPoints] = useState<ChartPoint[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    if (!coingeckoId) {
      setPoints(null);
      setFailed(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    void fetchCoinGeckoMarketChart(coingeckoId, days).then((data) => {
      if (!data?.length) {
        setPoints(null);
        setFailed(true);
      } else {
        setPoints(data);
        setFailed(false);
      }
      setLoading(false);
    });
  }, [coingeckoId, days]);

  useEffect(() => {
    load();
  }, [load]);

  const chartData = useMemo(
    () => (points ?? []).map((p) => ({ t: p.t, price: p.price, label: formatAxisDate(p.t) })),
    [points],
  );

  const latest = points?.length ? points[points.length - 1]!.price : null;
  const first = points?.length ? points[0]!.price : null;
  const rangeChange =
    latest != null && first != null && first > 0 ? ((latest - first) / first) * 100 : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Chart"
        title={symbol}
        description={coingeckoId ? `CoinGecko · ${days}d USD` : "Price history"}
        backTo={{ label: "← Tokens", href: paths.tokens }}
      />
      <AIInsight {...INSIGHTS.chart} className="reveal reveal-1" />

      {!coingeckoId ? (
        <EmptyState
          icon="📈"
          title="No price history yet"
          description="This token has no CoinGecko feed. Signet does not show synthetic chart data."
        />
      ) : loading ? (
        <CardSkeleton lines={4} />
      ) : failed || !chartData.length ? (
        <ErrorState
          title="Chart unavailable"
          description="CoinGecko returned no market data for this token. Signet does not synthesise fake candles."
          onRetry={load}
        />
      ) : (
        <section className="glass-card-glow p-5 reveal reveal-1">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <p className="font-heading text-2xl font-bold tabular-nums text-signet-text">
              {latest != null ? formatPrice(latest) : "—"}
            </p>
            {rangeChange != null && (
              <p
                className={`text-sm font-semibold tabular-nums ${
                  rangeChange >= 0 ? "text-signet-verdant" : "text-signet-danger"
                }`}
              >
                {rangeChange >= 0 ? "+" : ""}
                {rangeChange.toFixed(2)}% ({days}d)
              </p>
            )}
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tokenChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: "#8A8980", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fill: "#8A8980", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => formatPrice(Number(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111118",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#8A8980" }}
                  formatter={(v: number) => [formatPrice(v), "Price"]}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  fill="url(#tokenChartGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </PageShell>
  );
}
