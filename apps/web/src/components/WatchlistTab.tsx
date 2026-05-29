"use client";

import { useState } from "react";
import { useWatchlist, useWatchlistLive } from "@/lib/useWatchlist";
import { fmtAge } from "@/lib/utils";

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";

function fmtUsd(n?: number): string {
  if (n === undefined || !isFinite(n)) return "—";
  if (n >= 1)        return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n >= 0.0001)   return `$${n.toPrecision(3)}`;
  return `$${n.toExponential(2)}`;
}
function fmtCompact(n?: number): string {
  if (n === undefined || !isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function WatchlistTab({ isMobile }: { isMobile?: boolean }) {
  const { entries, remove, setAlert } = useWatchlist();
  const live = useWatchlistLive(entries);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [alertInput, setAlertInput] = useState("");

  return (
    <div style={{ padding: isMobile ? "14px 14px 80px" : "18px 22px", maxWidth: 680, fontFamily: MONO }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <h1 style={{ fontSize: isMobile ? 15 : 18, fontWeight: 800, color: "#f4f4f5", margin: 0 }}>Watchlist</h1>
        <span style={{ fontSize: 10, color: "#52525b" }}>{entries.length} token{entries.length !== 1 ? "s" : ""}</span>
      </div>

      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>👁</div>
          <div style={{ fontSize: 13, color: "#52525b" }}>No tokens on watchlist yet.</div>
          <div style={{ fontSize: 11, color: "#3f3f46", marginTop: 6 }}>Click the bookmark icon on any gem card to add it here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map(e => (
            <div key={e.mint} style={{ background: "#0a0a0d", border: "1px solid #1e1e24", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: editingAlert === e.mint ? 10 : 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#f4f4f5" }}>{e.sym}</span>
                    <span style={{ fontSize: 10, color: "#52525b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>{e.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3 }}>
                    {(() => {
                      const d = live[e.mint];
                      if (!d || d.loading) return <span style={{ fontSize: 11, color: "#3f3f46" }}>loading…</span>;
                      const chg = d.priceChange;
                      const chgColor = chg === undefined ? "#52525b" : chg >= 0 ? "#22c55e" : "#ef4444";
                      return (
                        <>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#e4e4e7" }}>{fmtUsd(d.priceUsd)}</span>
                          {chg !== undefined && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: chgColor }}>
                              {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                            </span>
                          )}
                          <span style={{ fontSize: 9, color: "#52525b" }}>MC {fmtCompact(d.marketCap)} · Vol {fmtCompact(d.volume24h)}</span>
                        </>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: 9, color: "#3f3f46", marginTop: 2 }}>
                    {e.mint.slice(0, 8)}…{e.mint.slice(-6)} · added {fmtAge(e.addedAt)}
                    {e.alertPrice !== undefined && (
                      <span style={{ marginLeft: 8, color: "#f59e0b" }}>⚡ alert @ ${e.alertPrice}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setEditingAlert(editingAlert === e.mint ? null : e.mint); setAlertInput(e.alertPrice !== undefined ? String(e.alertPrice) : ""); }}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #f59e0b44", background: e.alertPrice !== undefined ? "#f59e0b18" : "transparent", color: "#f59e0b", fontSize: 10, cursor: "pointer" }}>
                    ⚡ Alert
                  </button>
                  <button onClick={() => window.open(`https://dexscreener.com/solana/${e.mint}`, "_blank")}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 10, cursor: "pointer" }}>
                    Chart ↗
                  </button>
                  <button onClick={() => remove(e.mint)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #ef444430", background: "transparent", color: "#ef4444", fontSize: 10, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              </div>
              {editingAlert === e.mint && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#71717a" }}>Alert price ($):</span>
                  <input
                    type="number" value={alertInput} onChange={e2 => setAlertInput(e2.target.value)}
                    placeholder="0.00001" step="any" min="0"
                    style={{ flex: 1, background: "#09090b", border: "1px solid #27272a", borderRadius: 6, color: "#f4f4f5", padding: "5px 10px", fontSize: 11, outline: "none", fontFamily: MONO }}
                  />
                  <button onClick={() => {
                    const v = parseFloat(alertInput);
                    setAlert(e.mint, isNaN(v) ? undefined : v);
                    setEditingAlert(null);
                  }} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#f59e0b", color: "#000", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                    Save
                  </button>
                  <button onClick={() => { setAlert(e.mint, undefined); setEditingAlert(null); }}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 10, cursor: "pointer" }}>
                    Clear
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
