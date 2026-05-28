"use client";

import { useEffect, useState } from "react";

interface MriScore {
  mint: string;
  sym: string;
  name: string;
  total: number;
  tier: "ALERT" | "S" | "A" | "B" | "IGNORE";
  components: {
    onChain: number;
    social: number;
    kol: number;
    liquidity: number;
    momentum: number;
    freshness: number;
  };
  signals: string[];
  computedAt: number;
}

const TIER_COLORS: Record<string, string> = {
  ALERT: "#ff2b4e",
  S: "#10b981",
  A: "#3b82f6",
  B: "#eab308",
  IGNORE: "#52525b",
};

const AXES = ["OnChain", "Social", "KOL", "Liquidity", "Momentum", "Freshness"];
const MAX_VALUES = [20, 20, 20, 20, 10, 10];

function polarToCart(cx: number, cy: number, r: number, angleIdx: number, total: number) {
  const angle = (Math.PI * 2 * angleIdx) / total - Math.PI / 2;
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function buildPolygon(values: number[], cx: number, cy: number, outerR: number) {
  return values
    .map((v, i) => {
      const pt = polarToCart(cx, cy, v * outerR, i, values.length);
      return `${pt.x},${pt.y}`;
    })
    .join(" ");
}

function RadarChart({ score }: { score: MriScore }) {
  const cx = 100;
  const cy = 100;
  const outerR = 80;
  const color = TIER_COLORS[score.tier] ?? "#52525b";

  const normalized = [
    score.components.onChain / MAX_VALUES[0],
    score.components.social / MAX_VALUES[1],
    score.components.kol / MAX_VALUES[2],
    score.components.liquidity / MAX_VALUES[3],
    score.components.momentum / MAX_VALUES[4],
    score.components.freshness / MAX_VALUES[5],
  ];

  const gridLevels = [0.25, 0.5, 0.75];
  const n = AXES.length;

  const hexPoints = (frac: number) =>
    Array.from({ length: n }, (_, i) => {
      const pt = polarToCart(cx, cy, frac * outerR, i, n);
      return `${pt.x},${pt.y}`;
    }).join(" ");

  return (
    <svg width={200} height={200} viewBox="0 0 200 200">
      {gridLevels.map((frac) => (
        <polygon
          key={frac}
          points={hexPoints(frac)}
          fill="none"
          stroke="#1e1e24"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const tip = polarToCart(cx, cy, outerR, i, n);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={tip.x}
            y2={tip.y}
            stroke="#1e1e24"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={buildPolygon(normalized, cx, cy, outerR)}
        fill={color}
        fillOpacity={0.3}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {AXES.map((label, i) => {
        const tip = polarToCart(cx, cy, outerR + 12, i, n);
        return (
          <text
            key={label}
            x={tip.x}
            y={tip.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={8}
            fill="#52525b"
            fontFamily="'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div
      style={{
        maxWidth: 340,
        background: "#0e0e12",
        border: "1px solid #1e1e24",
        borderRadius: 12,
        padding: 16,
        fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div
            style={{
              width: 80,
              height: 16,
              background: "#1e1e24",
              borderRadius: 4,
              marginBottom: 6,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: 120,
              height: 12,
              background: "#1e1e24",
              borderRadius: 4,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        </div>
        <div
          style={{
            width: 48,
            height: 48,
            background: "#1e1e24",
            borderRadius: 8,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      <div
        style={{
          width: 200,
          height: 200,
          background: "#1e1e24",
          borderRadius: 8,
          margin: "0 auto 16px",
          animation: "pulse 1.5s ease-in-out infinite",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[100, 140, 120].map((w, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: 10,
              background: "#1e1e24",
              borderRadius: 4,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

export default function MriRadarCard({ mint, isMobile }: { mint: string; isMobile?: boolean }) {
  const [score, setScore] = useState<MriScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/mri/score?mint=${mint}`)
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((data: MriScore) => {
        setScore(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [mint]);

  if (loading) return <LoadingSkeleton />;

  const cardStyle: React.CSSProperties = {
    maxWidth: 340,
    background: "#0e0e12",
    border: "1px solid #1e1e24",
    borderRadius: 12,
    padding: 16,
    fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace",
  };

  if (error || !score) {
    return (
      <div style={cardStyle}>
        <span style={{ color: "#52525b", fontSize: 12 }}>MRI data unavailable</span>
      </div>
    );
  }

  const tierColor = TIER_COLORS[score.tier] ?? "#52525b";

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#f5f5f5" }}>{score.sym}</span>
            <span
              style={{
                background: tierColor + "22",
                color: tierColor,
                border: `1px solid ${tierColor}55`,
                borderRadius: 4,
                padding: "1px 6px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              {score.tier}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#71717a" }}>{score.name}</span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: tierColor, lineHeight: 1 }}>{score.total}</div>
          <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "0.12em", marginTop: 2 }}>MRI</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <RadarChart score={score} />
      </div>

      {score.signals.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {score.signals.slice(0, 3).map((sig, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
              <span style={{ color: "#52525b", fontSize: 9 }}>•</span>
              <span style={{ fontSize: 9, color: "#71717a", lineHeight: 1.4 }}>{sig}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
