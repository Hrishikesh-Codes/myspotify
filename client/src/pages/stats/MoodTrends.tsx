import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";
import { api } from "@/lib/api";
import type { AudioFeatures, PlayedTrack } from "@/types/api";
import {
  linearRegression,
  movingAverage,
  type Point2D,
} from "@/utils/stats";

// ── Theme constants ────────────────────────────────────────────────────────────
const C = {
  primary: "#8B5CF6",
  secondary: "#C084FC",
  accentPink: "#E879F9",
  success: "#34D399",
  warning: "#FBBF24",
  danger: "#F87171",
  primaryGlow: "#A78BFA",
  border: "#2A2A3E",
  textTertiary: "#6B6B80",
  textSecondary: "#A0A0B8",
  elevated: "#1A1A2E",
  surface: "#12121A",
};

// ── Data shape ─────────────────────────────────────────────────────────────────
interface TrackPoint {
  index: number;
  label: string; // track name truncated
  valence: number;
  energy: number;
  danceability: number;
  trackName: string;
  artist: string;
  albumArt: string;
}

// ── Custom tooltip for line chart ──────────────────────────────────────────────
function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border p-3 text-sm shadow-purple-glow"
      style={{ background: C.elevated }}
    >
      <p className="text-xs text-text-tertiary mb-2">Track #{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 leading-5">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-text-secondary capitalize">{entry.name}:</span>
          <span className="font-semibold text-text-primary">
            {(entry.value * 100).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Custom tooltip for scatter plot ───────────────────────────────────────────
function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as TrackPoint | undefined;
  if (!d) return null;
  return (
    <div
      className="rounded-lg border border-border p-3 text-sm shadow-purple-glow max-w-[200px]"
      style={{ background: C.elevated }}
    >
      {d.albumArt && (
        <img
          src={d.albumArt}
          alt=""
          className="w-12 h-12 rounded mb-2 object-cover"
        />
      )}
      <p className="font-semibold text-text-primary leading-tight truncate">
        {d.trackName}
      </p>
      <p className="text-xs text-text-secondary truncate">{d.artist}</p>
      <div className="mt-2 space-y-0.5 text-xs text-text-tertiary">
        <p>Energy: {(d.energy * 100).toFixed(0)}%</p>
        <p>Valence: {(d.valence * 100).toFixed(0)}%</p>
        <p>Danceability: {(d.danceability * 100).toFixed(0)}%</p>
      </div>
    </div>
  );
}

// ── Danceability → gradient color ─────────────────────────────────────────────
function danceColor(danceability: number): string {
  // 0 = primary purple, 1 = accent-pink
  const t = Math.max(0, Math.min(1, danceability));
  const r = Math.round(139 + t * (232 - 139));
  const g = Math.round(92 + t * (121 - 92));
  const b = Math.round(246 + t * (249 - 246));
  return `rgb(${r},${g},${b})`;
}

// ── Trend arrow helper ─────────────────────────────────────────────────────────
function TrendArrow({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={up ? "text-success" : "text-danger"}>
      {up ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ── Legend renderer ───────────────────────────────────────────────────────────
function PillLegend({ payload }: { payload?: any[] }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-2">
      {payload.map((entry: any) => (
        <span
          key={entry.value}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border"
          style={{ background: `${entry.color}18` }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-text-secondary capitalize">{entry.value}</span>
        </span>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MoodTrends() {
  const [tracks, setTracks] = useState<TrackPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"raw" | "smoothed">("raw");

  useEffect(() => {
    (async () => {
      try {
        const recent = await api.recentlyPlayed(50);
        const sorted = [...recent.items].sort(
          (a, b) =>
            new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
        );
        const ids = sorted.map((p) => p.track.id);
        const afRes = await api.audioFeatures(ids);
        const featureMap = new Map<string, AudioFeatures>();
        afRes.features.forEach(({ trackId, features }) => {
          if (features) featureMap.set(trackId, features);
        });

        const points: TrackPoint[] = sorted
          .map((p: PlayedTrack, i: number) => {
            const f = featureMap.get(p.track.id);
            if (!f) return null;
            return {
              index: i + 1,
              label: String(i + 1),
              valence: f.valence,
              energy: f.energy,
              danceability: f.danceability,
              trackName: p.track.name,
              artist: p.track.artists[0]?.name ?? "",
              albumArt: p.track.albumArt,
            };
          })
          .filter(Boolean) as TrackPoint[];

        setTracks(points);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Smoothed series ─────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!tracks.length) return [];
    if (mode === "raw") return tracks;

    const valSmooth = movingAverage(
      tracks.map((t) => t.valence),
      5
    );
    const engSmooth = movingAverage(
      tracks.map((t) => t.energy),
      5
    );
    const dncSmooth = movingAverage(
      tracks.map((t) => t.danceability),
      5
    );
    return tracks.map((t, i) => ({
      ...t,
      valence: valSmooth[i],
      energy: engSmooth[i],
      danceability: dncSmooth[i],
    }));
  }, [tracks, mode]);

  // ── Linear regression on valence ────────────────────────────────────────
  const regression = useMemo(() => {
    if (chartData.length < 2) return null;
    const pts: Point2D[] = chartData.map((t) => ({
      x: t.index,
      y: t.valence,
    }));
    return linearRegression(pts);
  }, [chartData]);

  const regressionLine = useMemo(() => {
    if (!regression || !chartData.length) return [];
    return chartData.map((t) => ({
      index: t.index,
      trend: regression.slope * t.index + regression.intercept,
    }));
  }, [regression, chartData]);

  // Merge regression into main chart data
  const mergedData = useMemo(() => {
    const trendMap = new Map(regressionLine.map((r) => [r.index, r.trend]));
    return chartData.map((t) => ({
      ...t,
      trend: trendMap.get(t.index) ?? null,
    }));
  }, [chartData, regressionLine]);

  // ── Summary card metrics ────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!tracks.length)
      return {
        avgValence: 0,
        avgEnergy: 0,
        avgDance: 0,
        valenceTrend: 0,
        energyTrend: 0,
        danceTrend: 0,
      };

    const half = Math.floor(tracks.length / 2);
    const first = tracks.slice(0, half);
    const last = tracks.slice(half);

    const avg = (arr: TrackPoint[], key: keyof TrackPoint) =>
      arr.reduce((s, t) => s + (t[key] as number), 0) / arr.length;

    const pct = (a: number, b: number) =>
      b === 0 ? 0 : ((b - a) / a) * 100;

    const avgValence = avg(tracks, "valence");
    const avgEnergy = avg(tracks, "energy");
    const avgDance = avg(tracks, "danceability");

    return {
      avgValence,
      avgEnergy,
      avgDance,
      valenceTrend: pct(avg(first, "valence"), avg(last, "valence")),
      energyTrend: pct(avg(first, "energy"), avg(last, "energy")),
      danceTrend: pct(avg(first, "danceability"), avg(last, "danceability")),
    };
  }, [tracks]);

  // ── Human-readable summary ──────────────────────────────────────────────
  const moodSummary = useMemo(() => {
    if (!regression) return null;
    const slopePct = regression.slope * tracks.length * 100;
    const direction =
      slopePct > 2 ? "happier 😊" : slopePct < -2 ? "sadder 😔" : "stable 😌";
    const pctStr = Math.abs(slopePct).toFixed(1);
    return `Your mood has trended ${pctStr}% ${direction} over your last ${tracks.length} tracks.`;
  }, [regression, tracks.length]);

  // ── Scatter data with dance-based color ─────────────────────────────────
  const scatterData = useMemo(
    () =>
      tracks.map((t) => ({
        ...t,
        fill: danceColor(t.danceability),
      })),
    [tracks]
  );

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="px-6 py-6 space-y-8 animate-fade-in">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48 rounded-lg" />
          <div className="skeleton h-4 w-64 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-80 rounded-xl" />
        <div className="skeleton h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Mood Trends
        </h1>
        <p className="text-text-secondary mt-1">
          How your music mood shifts over time
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Happiness",
            value: summary.avgValence,
            trend: summary.valenceTrend,
            icon: "☀️",
            iconColor: C.warning,
          },
          {
            label: "Energy",
            value: summary.avgEnergy,
            trend: summary.energyTrend,
            icon: "⚡",
            iconColor: C.danger,
          },
          {
            label: "Danceability",
            value: summary.avgDance,
            trend: summary.danceTrend,
            icon: "💃",
            iconColor: C.success,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-surface border border-border rounded-xl p-5"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl">{card.icon}</span>
              <span className="text-xs font-semibold">
                <TrendArrow pct={card.trend} />
              </span>
            </div>
            <p className="text-xs text-text-tertiary uppercase tracking-wider mt-3">
              {card.label}
            </p>
            <p className="text-3xl font-extrabold mt-1 text-gradient-purple">
              {(card.value * 100).toFixed(0)}
              <span className="text-base font-medium text-text-tertiary ml-0.5">
                %
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Line chart */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold">Mood Over Last {tracks.length} Tracks</h2>
          <div className="flex gap-1">
            {(["raw", "smoothed"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 ${
                  mode === m
                    ? "bg-primary text-white"
                    : "bg-elevated text-text-secondary hover:bg-border"
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={mergedData}>
            <defs>
              <linearGradient id="valFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.primary} stopOpacity={0.1} />
                <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="engFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.accentPink} stopOpacity={0.1} />
                <stop offset="100%" stopColor={C.accentPink} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dncFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.secondary} stopOpacity={0.1} />
                <stop offset="100%" stopColor={C.secondary} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke={`${C.border}33`}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="index"
              tick={{ fill: C.textTertiary, fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "Track #",
                position: "insideBottom",
                offset: -2,
                fill: C.textTertiary,
                fontSize: 11,
                fontFamily: "Plus Jakarta Sans",
              }}
            />
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              tick={{ fill: C.textTertiary, fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
              axisLine={false}
              tickLine={false}
              domain={[0, 1]}
              width={42}
            />
            <Tooltip content={<LineTooltip />} />
            <Legend content={<PillLegend />} />

            {/* Area fills */}
            <Area
              type="monotone"
              dataKey="valence"
              stroke="none"
              fill="url(#valFill)"
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="energy"
              stroke="none"
              fill="url(#engFill)"
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="danceability"
              stroke="none"
              fill="url(#dncFill)"
              legendType="none"
            />

            {/* Lines */}
            <Line
              type="monotone"
              dataKey="valence"
              stroke={C.primary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: C.primary }}
              name="valence"
            />
            <Line
              type="monotone"
              dataKey="energy"
              stroke={C.accentPink}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: C.accentPink }}
              name="energy"
            />
            <Line
              type="monotone"
              dataKey="danceability"
              stroke={C.secondary}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: C.secondary }}
              name="danceability"
            />

            {/* Regression trend line */}
            <Line
              type="monotone"
              dataKey="trend"
              stroke={C.primaryGlow}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              legendType="none"
              name="trend"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* R² badge + legend */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-0 border-t-2 border-dashed"
              style={{ borderColor: C.primaryGlow }}
            />
            <span className="text-xs text-text-tertiary">Valence trend</span>
          </div>
          {regression && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: `${C.primaryGlow}20`,
                color: C.primaryGlow,
                border: `1px solid ${C.primaryGlow}40`,
              }}
            >
              R² = {regression.rSquared.toFixed(3)}
            </span>
          )}
        </div>
      </div>

      {/* Human-readable summary */}
      {moodSummary && (
        <div className="bg-surface border border-border rounded-xl px-5 py-4">
          <p className="text-sm text-text-secondary leading-relaxed">
            {moodSummary}
          </p>
        </div>
      )}

      {/* Scatter: energy vs valence */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="text-base font-bold mb-1">Energy vs Valence</h2>
        <p className="text-xs text-text-tertiary mb-6">
          Dot color = danceability (purple → pink). Hover for track details.
        </p>

        <div className="relative">
          {/* Quadrant labels */}
          <div className="absolute inset-0 pointer-events-none z-10 flex">
            <div className="flex flex-col w-1/2">
              <div className="flex-1 flex items-start justify-start pt-2 pl-12">
                <span className="text-[10px] text-text-tertiary font-medium">
                  Chill Vibes
                </span>
              </div>
              <div className="flex-1 flex items-end justify-start pb-2 pl-12">
                <span className="text-[10px] text-text-tertiary font-medium">
                  Melancholic
                </span>
              </div>
            </div>
            <div className="flex flex-col w-1/2">
              <div className="flex-1 flex items-start justify-end pt-2 pr-4">
                <span className="text-[10px] text-text-tertiary font-medium">
                  Party Mode
                </span>
              </div>
              <div className="flex-1 flex items-end justify-end pb-2 pr-4">
                <span className="text-[10px] text-text-tertiary font-medium">
                  Intense
                </span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid
                stroke={`${C.border}33`}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="energy"
                name="Energy"
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: C.textTertiary, fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Energy →",
                  position: "insideBottom",
                  offset: -5,
                  fill: C.textTertiary,
                  fontSize: 11,
                  fontFamily: "Plus Jakarta Sans",
                }}
              />
              <YAxis
                dataKey="valence"
                name="Valence"
                type="number"
                domain={[0, 1]}
                tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                tick={{ fill: C.textTertiary, fontSize: 11, fontFamily: "Plus Jakarta Sans" }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: "Valence →",
                  angle: -90,
                  position: "insideLeft",
                  offset: 10,
                  fill: C.textTertiary,
                  fontSize: 11,
                  fontFamily: "Plus Jakarta Sans",
                }}
                width={46}
              />
              {/* Quadrant lines */}
              <ReferenceLine x={0.5} stroke={`${C.border}66`} strokeDasharray="4 4" />
              <ReferenceLine y={0.5} stroke={`${C.border}66`} strokeDasharray="4 4" />

              <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Scatter
                data={scatterData}
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={payload.fill}
                      fillOpacity={0.85}
                      stroke={payload.fill}
                      strokeWidth={1}
                      strokeOpacity={0.5}
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Danceability legend */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-text-tertiary">Low danceability</span>
          <div
            className="h-2 flex-1 rounded-full"
            style={{
              background: `linear-gradient(to right, ${C.primary}, ${C.accentPink})`,
            }}
          />
          <span className="text-xs text-text-tertiary">High danceability</span>
        </div>
      </div>
    </div>
  );
}
