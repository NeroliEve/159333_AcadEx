"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  type TooltipContentProps,
  type TooltipValueType,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

type SummaryStats = {
  total_exchanges:   number;
  avg_per_month:     number;
  this_month_count:  number;
  last_month_count:  number;
  growth_percentage: number | null;
  avg_agreed_price:  number;
};

type MonthlyData = {
  month:          string;
  year:           number;
  exchange_count: number;
};

type StudyAreaData = {
  study_area:     string;
  exchange_count: number;
};

type ListingTypeData = {
  listing_type:   string;
  exchange_count: number;
};

type TopBook = {
  title:          string;
  author:         string;
  exchange_count: number;
};

type YearLevelData = {
  year_level:     string;
  exchange_count: number;
};

type StatsResponse = {
  summary:       SummaryStats | null;
  byMonth:       MonthlyData[];
  byStudyArea:   StudyAreaData[];
  byListingType: ListingTypeData[];
  topBooks:      TopBook[];
  byYearLevel:   YearLevelData[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#1F5EE4", "#6B9FF7", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444"];

function formatListingType(type: string) {
  switch (type) {
    case "sale_only":    return "For sale";
    case "trade_only":   return "Trade only";
    case "sale_or_trade": return "Sale or trade";
    default:             return type;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NZ", {
    currency: "NZD",
    style: "currency",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatYearLevel(level: string) {
  if (level === "Unknown") return "No course";
  return `Year ${level}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function formatTooltipValue(value: TooltipValueType | undefined) {
  if (Array.isArray(value)) {
    return value.join(" - ");
  }

  return value ?? "N/A";
}

function getTooltipName(name: unknown, dataKey: unknown) {
  if (typeof name === "string" || typeof name === "number") {
    return name;
  }

  if (typeof dataKey === "string" || typeof dataKey === "number") {
    return dataKey;
  }

  return "Value";
}

function ChartTooltip({
  active,
  label,
  payload,
}: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || payload.length === 0) {
    return null;
  }

  return (
    <div className="min-w-32 rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-lg">
      {label != null ? (
        <p className="mb-1 max-w-48 truncate text-xs font-medium text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {payload.map((item, index) => {
          const colour = item.color ?? item.fill ?? item.stroke ?? "hsl(var(--primary))";
          const name = getTooltipName(item.name, item.dataKey);

          return (
            <div key={`${name}-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: colour }}
                />
                <span className="truncate text-muted-foreground">{name}</span>
              </span>
              <span className="font-medium tabular-nums">
                {formatTooltipValue(item.value)}
                {item.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const subColour =
    tone === "positive" ? "text-emerald-600"
    : tone === "negative" ? "text-red-500"
    : "text-muted-foreground";

  return (
    <Card className="border-border/70">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        {sub && <p className={`mt-1 text-xs ${subColour}`}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-border/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg bg-muted/40">
      <p className="text-sm text-muted-foreground">No completed exchanges yet</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminStatsPanel() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((json: StatsResponse & { message?: string }) => {
        if (json.message) {
          setError(json.message);
        } else {
          setData(json);
        }
      })
      .catch(() => setError("Failed to load statistics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
          <div className="h-64 animate-pulse rounded-xl border border-border/70 bg-muted/40" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/40 p-8 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { summary, byMonth, byStudyArea, byListingType, topBooks, byYearLevel } = data;

  // Derived values for stat cards
  const growthTone =
    summary?.growth_percentage == null ? "neutral"
    : summary.growth_percentage >= 0 ? "positive"
    : "negative";

  const growthLabel =
    summary?.growth_percentage == null
      ? "No prior month data"
      : `${summary.growth_percentage >= 0 ? "+" : ""}${summary.growth_percentage}% vs last month`;

  // Format monthly data for Recharts
  const monthlyChartData = byMonth.map((d) => ({
    name:      `${d.month} ${d.year}`,
    Exchanges: Number(d.exchange_count),
  }));

  // Format study area data
  const studyAreaChartData = byStudyArea.map((d) => ({
    name:      d.study_area,
    Exchanges: Number(d.exchange_count),
  }));

  // Format listing type data for pie chart
  const listingTypeChartData = byListingType.map((d) => ({
    name:  formatListingType(d.listing_type),
    value: Number(d.exchange_count),
  }));

  // Format year level data
  const yearLevelChartData = byYearLevel.map((d) => ({
    name:      formatYearLevel(d.year_level),
    Exchanges: Number(d.exchange_count),
  }));

  return (
    <div className="space-y-6">

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total exchanges"
          value={summary?.total_exchanges ?? 0}
        />
        <StatCard
          label="This month"
          value={summary?.this_month_count ?? 0}
          sub={growthLabel}
          tone={growthTone}
        />
        <StatCard
          label="Avg per month"
          value={summary?.avg_per_month ?? 0}
        />
        <StatCard
          label="Avg agreed price"
          value={summary?.avg_agreed_price ? formatCurrency(summary.avg_agreed_price) : "N/A"}
          sub="Sales only — excludes trades"
        />
      </div>

      {/* ── Monthly trend ── */}
      <SectionCard title="Exchanges over time">
        {monthlyChartData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="exchangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1F5EE4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1F5EE4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
              <RechartsTooltip content={ChartTooltip} />
              <Area
                type="monotone"
                dataKey="Exchanges"
                stroke="#1F5EE4"
                strokeWidth={2}
                fill="url(#exchangeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── Study area + listing type ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Exchanges by study area">
          {studyAreaChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={studyAreaChartData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <RechartsTooltip content={ChartTooltip} />
                <Bar dataKey="Exchanges" fill="#1F5EE4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Sale vs trade split">
          {listingTypeChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={listingTypeChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                >
                  {listingTypeChartData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip content={ChartTooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Year level + top books ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Exchanges by year level">
          {yearLevelChartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={yearLevelChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
                <RechartsTooltip content={ChartTooltip} />
                <Bar dataKey="Exchanges" fill="#6B9FF7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard title="Most exchanged books">
          {topBooks.length === 0 ? (
            <EmptyChart />
          ) : (
            <ol className="space-y-2">
              {topBooks.map((book, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{book.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {book.author} · {book.exchange_count} exchange{Number(book.exchange_count) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      </div>

    </div>
  );
}
