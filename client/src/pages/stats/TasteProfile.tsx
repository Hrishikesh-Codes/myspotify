import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "@/lib/api";
import type { AudioFeatures, TrackItem } from "@/types/api";
import { kMeansClustering } from "@/utils/stats";

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  primary: "#8B5CF6",
  secondary: "#C084FC",
  accentPink: "#E879F9",
  success: "#34D399",
  border: "#2A2A3E",
  textTertiary: "#6B6B80",
  textSecondary: "#A0A0B8",
  elevated: "#1A1A2E",
  surface: "#12121A",
  primaryGlow: "#A78BFA",
};

// ── Cluster definitions ───────────────────────────────────────────────────────
interface ClusterMeta {
  name: string;
  emoji: string;
  color: string;
  colorLight: string;
}

function labelCluster(cx: number, cy: number): ClusterMeta {
  const highEnergy = cx > 0.5;
  const highValence = cy > 0.5;

  if (highEnergy && highValence) {
    return {
      name: "Party Anthems",
      emoji: "🎉",
      color: C.accentPink,
      colorLight: `${C.accentPink}20`,
    };
  }
  if (highEnergy && !highValence) {
    return {
      name: "Intense & Dark",
      emoji: "🔥",
      color: C.primary,
      colorLight: `${C.primary}20`,
    };
  }
  if (!highEnergy && highValence) {
    return {
      name: "Feel-Good Chill",
      emoji: "☀️",
      color: C.success,
      colorLight: `${C.success}20`,
    };
  }
  return {
    name: "Late Night Melancholy",
    emoji: "🌙",
    color: C.secondary,
    colorLight: `${C.secondary}20`,
  };
}

// ── Custom scatter tooltip ─────────────────────────────────────────────────────
function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as EnrichedPoint | undefined;
  if (!d) return null;
  return (
    <div
      className="rounded-lg border border-border p-3 text-sm shadow-purple-glow max-w-[190px]"
      style={{ background: C.elevated }}
    >
      {d.albumArt && (
        <img
          src={d.albumArt}
          alt=""
          className="w-10 h-10 rounded mb-2 object-cover"
        />
      )}
      <p className="font-semibold text-text-primary leading-tight truncate">
        {d.trackName}
      </p>
      <p className="text-xs text-text-secondary truncate">{d.artist}</p>
      <div className="mt-2 text-xs text-text-tertiary space-y-0.5">
        <p>Energy: {(d.energy * 100).toFixed(0)}%</p>
        <p>Valence: {(d.valence * 100).toFixed(0)}%</p>
      </div>
    </div>
  );
}

// ── Donut centre label ─────────────────────────────────────────────────────────
function DonutLabel({
  viewBox,
  name,
  pct,
  color,
}: {
  viewBox?: { cx: number; cy: number };
  name: string;
  pct: number;
  color: string;
}) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <text textAnchor="middle" dominantBaseline="middle">
      <tspan
        x={cx}
        y={cy - 10}
        fontSize={20}
        fontWeight={800}
        fill={color}
        fontFamily="Plus Jakarta Sans"
      >
        {pct}%
      </tspan>
      <tspan
        x={cx}
        dy={18}
        fontSize={9}
        fill={C.textTertiary}
        fontFamily="Plus Jakarta Sans"
      >
        {name.split(" ").slice(0, 2).join(" ")}
      </tspan>
    </text>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface EnrichedPoint {
  x: number; // energy
  y: number; // valence
  energy: number;
  valence: number;
  trackName: string;
  artist: string;
  albumArt: string;
  clusterIdx: number;
}

interface ClusterData {
  meta: ClusterMeta;
  points: EnrichedPoint[];
  pct: number;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TasteProfile() {
  const [tracks, setTracks] = useState<TrackItem[]>([]);
  const [features, setFeatures] = useState<Map<string, AudioFeatures>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const tracksRes = await api.topTracks("medium_term", 50);
        const ids = tracksRes.items.map((t) => t.id);
        const afRes = await api.audioFeatures(ids);
        const map = new Map<string, AudioFeatures>();
        afRes.features.forEach(({ trackId, features: f }) => {
          if (f) map.set(trackId, f);
        });
        setTracks(tracksRes.items);
        setFeatures(map);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── K-means clustering (k=4) on valence + energy ──────────────────────
  const { clusters } = useMemo(() => {
    const pts = tracks
      .map((t) => {
        const f = features.get(t.id);
        if (!f) return null;
        return { x: f.energy, y: f.valence, track: t, features: f };
      })
      .filter(Boolean) as {
      x: number;
      y: number;
      track: TrackItem;
      features: AudioFeatures;
    }[];

    if (pts.length < 4) {
      return { clusters: [] as ClusterData[], enrichedPoints: [] as EnrichedPoint[] };
    }

    const kResult = kMeansClustering(
      pts.map((p) => ({ x: p.x, y: p.y })),
      4,
      150
    );

    const enrichedPoints: EnrichedPoint[] = pts.map((p, i) => {
      const clusterIdx = kResult.clusters.findIndex((c) =>
        c.indices.includes(i)
      );
      return {
        x: p.x,
        y: p.y,
        energy: p.features.energy,
        valence: p.features.valence,
        trackName: p.track.name,
        artist: p.track.artists[0]?.name ?? "",
        albumArt: p.track.albumArt,
        clusterIdx,
      };
    });

    const total = pts.length;
    const clusterDatas: ClusterData[] = kResult.clusters.map((c, i) => {
      const meta = labelCluster(c.centroid.x, c.centroid.y);
      const clusterPoints = enrichedPoints.filter((p) => p.clusterIdx === i);
      return {
        meta,
        points: clusterPoints,
        pct: Math.round((c.indices.length / total) * 100),
      };
    });

    return { clusters: clusterDatas };
  }, [tracks, features]);

  // ── Dominant cluster ─────────────────────────────────────────────────
  const dominant = useMemo(
    () =>
      clusters.reduce(
        (best, c) => (c.pct > best.pct ? c : best),
        clusters[0] ?? { meta: { name: "", color: C.primary, colorLight: "", emoji: "" }, pct: 0, points: [] }
      ),
    [clusters]
  );

  // ── Pie data ──────────────────────────────────────────────────────────
  const pieData = useMemo(
    () =>
      clusters.map((c) => ({
        name: c.meta.name,
        value: c.pct,
        color: c.meta.color,
      })),
    [clusters]
  );

  if (loading) {
    return (
      <div className="px-6 py-6 space-y-8 animate-fade-in">
        <div className="space-y-2">
          <div className="skeleton h-8 w-52 rounded-lg" />
          <div className="skeleton h-4 w-60 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-80 rounded-xl" />
          <div className="skeleton h-80 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Your Taste DNA
        </h1>
        <p className="text-text-secondary mt-1">
          What your music says about you
        </p>
      </div>

      {/* Scatter + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Scatter plot */}
        <div className="lg:col-span-3 bg-surface border border-border rounded-xl p-6">
          <h2 className="text-base font-bold mb-1">Listening Clusters</h2>
          <p className="text-xs text-text-tertiary mb-5">
            K-means (k=4) on your top 50 tracks — energy (x) vs valence (y)
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid
                stroke={`${C.border}33`}
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="x"
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
                dataKey="y"
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
              <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: "3 3" }} />

              {clusters.map((cluster, i) => (
                <Scatter
                  key={i}
                  name={cluster.meta.name}
                  data={cluster.points}
                  shape={(props: any) => {
                    const { cx, cy } = props;
                    return (
                      <g>
                        {/* Subtle glow ring */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill={cluster.meta.color}
                          fillOpacity={0.08}
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={cluster.meta.color}
                          fillOpacity={0.85}
                          stroke={cluster.meta.color}
                          strokeWidth={1}
                          strokeOpacity={0.4}
                          style={{ transition: "r 0.15s" }}
                        />
                      </g>
                    );
                  }}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>

          {/* Cluster color legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {clusters.map((c, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                style={{
                  background: c.meta.colorLight,
                  borderColor: `${c.meta.color}40`,
                  color: c.meta.color,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: c.meta.color }}
                />
                {c.meta.emoji} {c.meta.name}
              </span>
            ))}
          </div>
        </div>

        {/* Donut chart */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-6 flex flex-col">
          <h2 className="text-base font-bold mb-1">Cluster Split</h2>
          <p className="text-xs text-text-tertiary mb-3">
            How your top tracks break down
          </p>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.9} />
                  ))}
                  <DonutLabel
                    name={dominant?.meta.name ?? ""}
                    pct={dominant?.pct ?? 0}
                    color={dominant?.meta.color ?? C.primary}
                  />
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}%`, ""]}
                  contentStyle={{
                    background: C.elevated,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    color: "#F8F8FF",
                    fontFamily: "Plus Jakarta Sans",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {clusters.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: c.meta.color }}
                  />
                  <span className="text-text-secondary">
                    {c.meta.emoji} {c.meta.name}
                  </span>
                </div>
                <span className="font-bold" style={{ color: c.meta.color }}>
                  {c.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-cluster cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clusters.map((cluster, i) => (
          <div
            key={i}
            className="bg-surface border border-border rounded-xl overflow-hidden"
            style={{
              borderLeft: `3px solid ${cluster.meta.color}`,
            }}
          >
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{cluster.meta.emoji}</span>
                <h3 className="font-bold text-text-primary">
                  {cluster.meta.name}
                </h3>
                <span
                  className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: cluster.meta.colorLight,
                    color: cluster.meta.color,
                  }}
                >
                  {cluster.points.length} tracks
                </span>
              </div>
              <p className="text-xs text-text-tertiary">
                {cluster.pct}% of your taste profile
              </p>
            </div>

            {/* Track scroll */}
            <div className="px-4 pb-4">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {cluster.points.slice(0, 5).map((point, j) => (
                  <div
                    key={j}
                    className="flex-none w-20 group"
                    title={`${point.trackName} — ${point.artist}`}
                  >
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden mb-1.5">
                      {point.albumArt ? (
                        <img
                          src={point.albumArt}
                          alt={point.trackName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: cluster.meta.colorLight }}
                        >
                          <span className="text-2xl">{cluster.meta.emoji}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-text-secondary leading-tight line-clamp-2 text-center">
                      {point.trackName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary card */}
      {clusters.length >= 2 && (
        <div
          className="rounded-xl p-5"
          style={{
            background: C.surface,
            border: "1px solid transparent",
            backgroundClip: "padding-box",
            boxShadow: `0 0 0 1px transparent, inset 0 0 0 1px ${C.border}`,
            backgroundImage: `linear-gradient(${C.surface}, ${C.surface}), linear-gradient(135deg, ${C.primary}, ${C.accentPink})`,
            backgroundOrigin: "border-box",
          }}
        >
          <div
            className="rounded-xl p-4"
            style={{
              background: `linear-gradient(135deg, ${C.primary}10, ${C.accentPink}10)`,
              border: `1px solid ${C.primary}30`,
            }}
          >
            <p className="text-sm text-text-secondary leading-relaxed">
              You're{" "}
              <span
                className="font-bold"
                style={{ color: dominant.meta.color }}
              >
                {dominant.pct}% {dominant.meta.emoji} {dominant.meta.name}
              </span>
              {clusters.length > 1 && (() => {
                const second = [...clusters]
                  .filter((c) => c.meta.name !== dominant.meta.name)
                  .sort((a, b) => b.pct - a.pct)[0];
                return second ? (
                  <>
                    {" "}
                    and{" "}
                    <span
                      className="font-bold"
                      style={{ color: second.meta.color }}
                    >
                      {second.pct}% {second.meta.emoji} {second.meta.name}
                    </span>
                  </>
                ) : null;
              })()}
              . {dominant.meta.name === "Party Anthems"
                ? "You live for the energy — your playlist is a non-stop celebration. 🎊"
                : dominant.meta.name === "Late Night Melancholy"
                ? "You feel music deeply. The quiet hours are yours. 🌙"
                : dominant.meta.name === "Feel-Good Chill"
                ? "Positive vibes without the chaos — the perfect sunny day playlist. ☀️"
                : "You don't shy away from intensity. Raw, powerful, unfiltered. 🔥"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
