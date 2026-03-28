import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate, useSearchParams } from "react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { authenticate } from "../shopify.server";
import { requirePlan } from "../utils/plan.server";

type Range = "day" | "week" | "month" | "year";

const RANGE_CONFIG: Record<
  Range,
  { interval: string; groupBy: string; bucket: "hour" | "day" | "week" }
> = {
  day: {
    interval: "1 day",
    groupBy: "toStartOfHour(timestamp)",
    bucket: "hour",
  },
  week: {
    interval: "7 day",
    groupBy: "toDate(timestamp)",
    bucket: "day",
  },
  month: {
    interval: "30 day",
    groupBy: "toDate(timestamp)",
    bucket: "day",
  },
  year: {
    interval: "365 day",
    groupBy: "toStartOfWeek(timestamp)",
    bucket: "week",
  },
};

async function hogql(query: string) {
  const res = await fetch(
    `https://us.posthog.com/api/projects/${process.env.POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.POSTHOG_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    },
  );
  if (!res.ok) {
    console.error(`PostHog query failed (${res.status}):`, await res.text());
    return { results: [] };
  }
  return res.json();
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  await requirePlan(session.shop, "starter");

  if (!process.env.POSTHOG_API_KEY || !process.env.POSTHOG_PROJECT_ID) {
    return { configured: false, range: "month" as Range, series: [], totals: null };
  }

  const url = new URL(request.url);
  const rawRange = url.searchParams.get("range") ?? "month";
  const range: Range = ["day", "week", "month", "year"].includes(rawRange)
    ? (rawRange as Range)
    : "month";

  const { interval, groupBy } = RANGE_CONFIG[range];
  const shop = session.shop.replace(/'/g, "''");

  const [startedRes, completedRes, avgRes] = await Promise.all([
    hogql(
      `SELECT ${groupBy} as period, count() as count FROM events WHERE event = 'crossword_puzzle_started' AND properties.shop = '${shop}' AND timestamp >= now() - interval ${interval} GROUP BY period ORDER BY period`,
    ),
    hogql(
      `SELECT ${groupBy} as period, count() as count FROM events WHERE event = 'crossword_puzzle_completed' AND properties.shop = '${shop}' AND timestamp >= now() - interval ${interval} GROUP BY period ORDER BY period`,
    ),
    hogql(
      `SELECT avg(toFloat(properties.elapsed_seconds)) FROM events WHERE event = 'crossword_puzzle_completed' AND properties.shop = '${shop}' AND timestamp >= now() - interval ${interval}`,
    ),
  ]);

  // Merge started + completed into a single series keyed by period
  const periodMap = new Map<string, { started: number; completed: number }>();

  for (const [period, count] of startedRes.results ?? []) {
    const key = String(period);
    periodMap.set(key, { started: Number(count), completed: 0 });
  }
  for (const [period, count] of completedRes.results ?? []) {
    const key = String(period);
    const existing = periodMap.get(key) ?? { started: 0, completed: 0 };
    periodMap.set(key, { ...existing, completed: Number(count) });
  }

  const series = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, counts]) => ({ period, ...counts }));

  const totalStarted = series.reduce((s, r) => s + r.started, 0);
  const totalCompleted = series.reduce((s, r) => s + r.completed, 0);
  const completionRate =
    totalStarted > 0 ? Math.round((totalCompleted / totalStarted) * 100) : 0;
  const rawAvg = avgRes.results?.[0]?.[0];
  const avgSeconds =
    rawAvg != null && Number(rawAvg) > 0 ? Math.round(Number(rawAvg)) : null;

  return {
    configured: true,
    range,
    series,
    totals: { started: totalStarted, completed: totalCompleted, completionRate, avgSeconds },
  };
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatXAxis(period: string, bucket: "hour" | "day" | "week") {
  const d = new Date(period);
  if (isNaN(d.getTime())) return period;
  if (bucket === "hour") {
    return d.toLocaleTimeString([], { hour: "numeric", hour12: true });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base" background="subdued">
      <s-stack direction="block" gap="tight">
        <s-text tone="subdued">{label}</s-text>
        <s-heading>{value}</s-heading>
      </s-stack>
    </s-box>
  );
}

const RANGES: { value: Range; label: string }[] = [
  { value: "day", label: "24h" },
  { value: "week", label: "7d" },
  { value: "month", label: "30d" },
  { value: "year", label: "1y" },
];

export default function AnalyticsPage() {
  const { configured, range, series, totals } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!configured) {
    return (
      <s-page heading="Analytics">
        <s-section>
          <s-paragraph>
            Analytics are not yet configured. Add{" "}
            <s-text tone="subdued">POSTHOG_API_KEY</s-text> and{" "}
            <s-text tone="subdued">POSTHOG_PROJECT_ID</s-text> to your
            environment variables.
          </s-paragraph>
        </s-section>
      </s-page>
    );
  }

  const bucket = RANGE_CONFIG[range].bucket;

  return (
    <s-page heading="Analytics">
      {/* Summary stats */}
      <s-section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "16px",
            marginBottom: "8px",
          }}
        >
          <StatCard label="Puzzles started" value={String(totals?.started ?? 0)} />
          <StatCard label="Puzzles completed" value={String(totals?.completed ?? 0)} />
          <StatCard label="Completion rate" value={`${totals?.completionRate ?? 0}%`} />
          <StatCard
            label="Avg completion time"
            value={totals?.avgSeconds != null ? formatTime(totals.avgSeconds) : "—"}
          />
        </div>
      </s-section>

      {/* Chart */}
      <s-section>
        {/* Range toggle */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set("range", r.value);
                navigate(`?${params.toString()}`);
              }}
              style={{
                padding: "6px 16px",
                borderRadius: "6px",
                border: "1px solid",
                borderColor: range === r.value ? "#008060" : "#c9cccf",
                background: range === r.value ? "#008060" : "transparent",
                color: range === r.value ? "#fff" : "#202223",
                cursor: "pointer",
                fontWeight: range === r.value ? 600 : 400,
                fontSize: "14px",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {series.length === 0 ? (
          <s-paragraph>
            No activity in this period. Data will appear here once shoppers
            start playing crosswords on your store.
          </s-paragraph>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f2f3" />
              <XAxis
                dataKey="period"
                tickFormatter={(v) => formatXAxis(v, bucket)}
                tick={{ fontSize: 12, fill: "#6d7175" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#6d7175" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={(v) => formatXAxis(String(v), bucket)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e1e3e5",
                  fontSize: "13px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "13px", paddingTop: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="started"
                name="Started"
                stroke="#008060"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="#5c6ac4"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </s-section>
    </s-page>
  );
}
