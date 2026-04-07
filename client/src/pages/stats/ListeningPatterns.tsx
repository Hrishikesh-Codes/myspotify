import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { api } from "@/lib/api";
import type { PlayedTrack } from "@/types/api";
import { zScore } from "@/utils/stats";

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  primary: "#8B5CF6",
  secondary: "#C084FC",
  accentPink: "#E879F9",
  border: "#2A2A3E",
  textTertiary: "#6B6B80",
  textSecondary: "#A0A0B8",
  elevated: "#1A1A2E",
  surface: "#12121A",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? "12am" : i < 12 ? `${i}am` : i === 12 ? "12pm" : `${i - 12}pm`
);

// ── Bar tooltip ───────────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 text-sm shadow-purple-glow"
      style={{ background: C.elevated }}
    >
      <p className="text-text-tertiary text-xs">{label}</p>
      <p className="font-semibold text-text-primary">
        {payload[0].value} tracks
      </p>
    </div>
  );
}

// ── Rounded bar shape ─────────────────────────────────────────────────────────
function RoundedBar(props: any) {
  const { x, y, width, height, fill } = props;
  if (!height || height <= 0) return null;
  const radius = Math.min(4, width / 2);
  return (
    <path
      d={`M${x + radius},${y} h${width - radius * 2} a${radius},${radius} 0 0 1 ${radius},${radius} v${height - radius} h${-width} v${-(height - radius)} a${radius},${radius} 0 0 1 ${radius},-${radius}z`}
      fill={fill}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ListeningPatterns() {
  const [items, setItems] = useState<PlayedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{
    day: number;
    hour: number;
    count: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.recentlyPlayed(50);
        setItems(res.items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Build 7×24 heatmap grid ───────────────────────────────────────────
  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () =>
      new Array(24).fill(0)
    );
    items.forEach(({ playedAt }) => {
      const d = new Date(playedAt);
      const dow = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
      const hour = d.getHours();
      g[dow][hour]++;
    });
    return g;
  }, [items]);

  // ── Anomaly detection ─────────────────────────────────────────────────
  const { gridMean, gridStd } = useMemo(() => {
    const flat = grid.flat();
    const mean = flat.reduce((s, v) => s + v, 0) / flat.length;
    const std = Math.sqrt(
      flat.reduce((s, v) => s + (v - mean) ** 2, 0) / flat.length
    );
    return { gridMean: mean, gridStd: std };
  }, [grid]);

  const maxCell = useMemo(() => Math.max(...grid.flat(), 1), [grid]);

  // ── Peak day + hour ───────────────────────────────────────────────────
  const { peakDay, peakHour } = useMemo(() => {
    let best = { day: 0, hour: 0, count: -1 };
    grid.forEach((row, d) =>
      row.forEach((count, h) => {
        if (count > best.count) best = { day: d, hour: h, count };
      })
    );
    return { peakDay: DAYS[best.day], peakHour: HOURS[best.hour] };
  }, [grid]);

  // ── Day / hour bar chart data ─────────────────────────────────────────
  const dayData = useMemo(
    () => DAYS.map((label, i) => ({ label, count: grid[i].reduce((s, v) => s + v, 0) })),
    [grid]
  );
  const hourData = useMemo(
    () =>
      HOURS.map((label, i) => ({
        label,
        count: grid.reduce((s, row) => s + row[i], 0),
      })),
    [grid]
  );

  const peakDayCount = Math.max(...dayData.map((d) => d.count), 1);
  const peakHourCount = Math.max(...hourData.map((h) => h.count), 1);

  // ── Heatmap cell color ────────────────────────────────────────────────
  function cellColor(count: number): string {
    if (count === 0) return C.elevated;
    const t = count / maxCell;
    if (t < 0.5) {
      // elevated → primary
      const p = t * 2;
      const r = Math.round(26 + p * (139 - 26));
      const g = Math.round(26 + p * (92 - 26));
      const b = Math.round(46 + p * (246 - 46));
      return `rgb(${r},${g},${b})`;
    } else {
      // primary → accent-pink
      const p = (t - 0.5) * 2;
      const r = Math.round(139 + p * (232 - 139));
      const g = Math.round(92 + p * (121 - 92));
      const b = Math.round(246 + p * (249 - 246));
      return `rgb(${r},${g},${b})`;
    }
  }

  const totalTracks = items.length;
  const uniqueDays = dayData.filter((d) => d.count > 0).length;

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-8 animate-fade-in">
        <div className="space-y-2">
          <div className="skeleton h-8 w-56 rounded-lg" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="skeleton h-56 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Listening Patterns
        </h1>
        <p className="text-text-secondary mt-1">When and how you listen</p>
      </div>

      {/* Heatmap */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold">Weekly Activity Heatmap</h2>
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: C.elevated, border: `1px solid ${C.border}` }}
            />
            <span>None</span>
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: C.primary }}
            />
            <span>Mid</span>
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: C.accentPink }}
            />
            <span>Peak</span>
          </div>
        </div>

        {/* Hour labels */}
        <div className="flex gap-1 mb-1 ml-10">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className="flex-1 text-center"
              style={{ fontSize: 8, color: C.textTertiary }}
            >
              {i % 6 === 0 ? HOURS[i] : ""}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        <div className="space-y-1">
          {DAYS.map((day, d) => (
            <div key={day} className="flex items-center gap-1">
              <span
                className="w-8 text-right shrink-0 mr-1"
                style={{ fontSize: 10, color: C.textTertiary }}
              >
                {day}
              </span>
              {grid[d].map((count, h) => {
                const z = zScore(count, gridMean, gridStd);
                const isAnomaly = z > 2;
                return (
                  <div
                    key={h}
                    className={`flex-1 aspect-square rounded-sm cursor-pointer transition-all duration-150 hover:ring-1 hover:ring-white/20 ${
                      isAnomaly ? "animate-pulse-glow" : ""
                    }`}
                    style={{
                      background: cellColor(count),
                      minWidth: 0,
                      outline: isAnomaly
                        ? `1px solid ${C.accentPink}80`
                        : undefined,
                    }}
                    onMouseEnter={() => setHoveredCell({ day: d, hour: h, count })}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${DAYS[d]} ${HOURS[h]}: ${count} track${count !== 1 ? "s" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Hover tooltip */}
        {hoveredCell && (
          <div
            className="mt-3 text-xs text-text-secondary px-3 py-2 rounded-lg border border-border"
            style={{ background: C.elevated }}
          >
            <span className="font-semibold text-text-primary">
              {DAYS[hoveredCell.day]} {HOURS[hoveredCell.hour]}
            </span>
            {" — "}
            {hoveredCell.count} track{hoveredCell.count !== 1 ? "s" : ""}
          </div>
        )}

        {/* Anomaly legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-text-tertiary">
          <div
            className="w-3 h-3 rounded-sm animate-pulse-glow"
            style={{
              background: C.accentPink,
              outline: `1px solid ${C.accentPink}80`,
            }}
          />
          <span>Unusual spike (z-score &gt; 2)</span>
        </div>
      </div>

      {/* Peak summary */}
      <div
        className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center gap-3"
      >
        <span className="text-2xl">🎧</span>
        <p className="text-sm text-text-secondary">
          You listen most on{" "}
          <span className="font-semibold text-text-primary">{peakDay}</span>{" "}
          around{" "}
          <span className="font-semibold text-text-primary">{peakHour}</span>.
          {totalTracks > 0 && (
            <>
              {" "}
              Tracked{" "}
              <span className="font-semibold text-primary-glow">
                {totalTracks}
              </span>{" "}
              recent plays across{" "}
              <span className="font-semibold text-primary-glow">
                {uniqueDays}
              </span>{" "}
              days.
            </>
          )}
        </p>
      </div>

      {/* Bar charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Day of week */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold mb-4">Tracks by Day of Week</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dayData} barSize={28}>
              <CartesianGrid
                stroke={`${C.border}33`}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: C.textTertiary, fontSize: 10, fontFamily: "Plus Jakarta Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: C.textTertiary, fontSize: 10, fontFamily: "Plus Jakarta Sans" }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: `${C.border}44` }} />
              <Bar dataKey="count" shape={<RoundedBar />} radius={[4, 4, 0, 0]}>
                {dayData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={
                      entry.count === peakDayCount ? C.accentPink : C.primary
                    }
                    fillOpacity={entry.count === peakDayCount ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hour of day */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-sm font-bold mb-4">Tracks by Hour of Day</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourData} barSize={8}>
              <CartesianGrid
                stroke={`${C.border}33`}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: C.textTertiary, fontSize: 9, fontFamily: "Plus Jakarta Sans" }}
                axisLine={false}
                tickLine={false}
                interval={5}
              />
              <YAxis
                tick={{ fill: C.textTertiary, fontSize: 10, fontFamily: "Plus Jakarta Sans" }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: `${C.border}44` }} />
              <Bar dataKey="count" shape={<RoundedBar />} radius={[4, 4, 0, 0]}>
                {hourData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={
                      entry.count === peakHourCount
                        ? C.accentPink
                        : C.secondary
                    }
                    fillOpacity={entry.count === peakHourCount ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
