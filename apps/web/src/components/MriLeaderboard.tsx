"use client";

import { useEffect, useRef, useState } from "react";

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

const COMPONENT_COLORS = {
  onChain: "#06b6d4",
  social: "#a855f7",
  kol: "#f59e0b",
  liquidity: "#10b981",
  momentum: "#3b82f6",
  freshness: "#ec4899",
};

const COMPONENT_KEYS = ["onChain", "social", "kol", "liquidity", "momentum", "freshness"] as const;

function MiniBarChart({ components, total }: { components: MriScore["components"]; total: number }) {
  const pct = Math.min(total / 100, 1);
  const compTotal =
    components.onChain +
    components.social +
    components.kol +
    components.liquidity +
    components.momentum +
    components.freshness;

  return (
    <div style={{ display: "flex", width: "100%", height: 4, borderRadius: 2, overflow: "hidden", background: "#1e1e24" }}>
      <div style={{ display: "flex", width: `${pct * 100}%`, height: "100%" }}>
        {COMPONENT_KEYS.map((key) => {
          const segW = compTotal > 0 ? (components[key] / compTotal) * 100 : 100 / 6;
          return (
            <div
              key={key}
              style={{
                width: `${segW}%`,
                height: "100%",
                background: COMPONENT_COLORS[key],
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function CopiedFeedback({ visible }: { visible: boolean }) {
  return (
    <span
      style={{
        position: "absolute",
        top: -20,
        right: 0,
        background: "#10b981",
        color: "#fff",
        fontSize: 9,
        padding: "2px 6px",
        borderRadius: 4,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      copied!
    </span>
  );
}

export default function MriLeaderboard({ isMobile }: { isMobile?: boolean }) {
  const [scores, setScores] = useState<MriScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [copiedMint, setCopiedMint] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScores = () => {
    fetch("/api/mri/leaderboard?limit=12")
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((data: { scores?: MriScore[] } | MriScore[]) => {
        const list = Array.isArray(data) ? data : (data.scores ?? []);
        setScores(list);
        setLastUpdated(Date.now());
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchScores();
    intervalRef.current = setInterval(fetchScores, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleCopy = (mint: string) => {
    navigator.clipboard.writeText(mint).then(() => {
      setCopiedMint(mint);
      setTimeout(() => setCopiedMint(null), 1500);
    });
  };

  const secondsAgo = lastUpdated ? Math.floor((now - lastUpdated) / 1000) : null;

  const containerStyle: React.CSSProperties = {
    background: "#0e0e12",
    border: "1px solid #1e1e24",
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    fontFamily: "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace",
    maxWidth: isMobile ? "100%" : 520,
  };

  return (
    <div style={containerStyle}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: "#f5f5f5" }}>Meme Radar Index</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#ff2b4e",
                  animation: "livePulse 1.5s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: 9, color: "#ff2b4e", fontWeight: 700, letterSpacing: "0.1em" }}>LIVE</span>
            </div>
            <button
              onClick={fetchScores}
              style={{
                background: "transparent",
                border: "1px solid #1e1e24",
                color: "#71717a",
                fontSize: 9,
                padding: "3px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.05em",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#52525b";
                (e.currentTarget as HTMLButtonElement).style.color = "#a3a3a3";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e1e24";
                (e.currentTarget as HTMLButtonElement).style.color = "#71717a";
              }}
            >
              Refresh
            </button>
          </div>
        </div>
        <span style={{ fontSize: 9, color: "#52525b" }}>top tokens by composite signal score</span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              style={{
                height: 36,
                background: "#1e1e24",
                borderRadius: 6,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : scores.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <span style={{ color: "#52525b", fontSize: 11 }}>Scanning for new tokens…</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {scores.map((s, idx) => {
            const tierColor = TIER_COLORS[s.tier] ?? "#52525b";
            return (
              <div
                key={s.mint}
                onClick={() => handleCopy(s.mint)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 8px",
                  borderRadius: 7,
                  cursor: "pointer",
                  position: "relative",
                  background: "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "#ffffff08";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                <CopiedFeedback visible={copiedMint === s.mint} />

                <span
                  style={{
                    fontSize: 10,
                    color: "#3f3f46",
                    fontWeight: 600,
                    minWidth: 20,
                    textAlign: "right",
                  }}
                >
                  #{idx + 1}
                </span>

                <span
                  style={{
                    background: tierColor + "22",
                    color: tierColor,
                    border: `1px solid ${tierColor}44`,
                    borderRadius: 4,
                    padding: "1px 5px",
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    minWidth: 36,
                    textAlign: "center",
                  }}
                >
                  {s.tier}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginBottom: 4 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 11,
                        color: "#f5f5f5",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.sym}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: "#52525b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: isMobile ? 60 : 100,
                      }}
                    >
                      {s.name}
                    </span>
                  </div>
                  <MiniBarChart components={s.components} total={s.total} />
                </div>

                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: tierColor,
                    minWidth: 28,
                    textAlign: "right",
                  }}
                >
                  {s.total}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid #1e1e24",
          textAlign: "right",
        }}
      >
        <span style={{ fontSize: 9, color: "#3f3f46" }}>
          {secondsAgo !== null ? `updated ${secondsAgo}s ago` : "—"}
        </span>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
      `}</style>
    </div>
  );
}
