"use client";
import { useState, useEffect } from "react";
import { IconZap, IconSearch, IconX } from "./icons";

interface Pair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd: string | null;
  priceNative: string;
  volume: Record<string, number>;
  priceChange: Record<string, number> | null;
  liquidity: { usd: number | null; base: number; quote: number } | null;
  txns: Record<string, { buys: number; sells: number }>;
  fdv: number | null;
  marketCap: number | null;
  pairCreatedAt: number | null;
  info?: {
    imageUrl?: string | null;
    websites?: { url: string }[] | null;
    socials?: { platform: string; handle: string }[] | null;
  } | null;
}

interface Props {
  address: string;
  symbol?: string;
  onClose: () => void;
  onSnipe?: (address: string, symbol: string) => void;
}

function fmt(n: number | null | undefined, prefix = "$"): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${prefix}${(n / 1e3).toFixed(1)}K`;
  return `${prefix}${n.toFixed(2)}`;
}

function pctColor(v: number | null | undefined): string {
  if (!v) return "#52525b";
  return v >= 0 ? "#10b981" : "#ef4444";
}

function PctBadge({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return <span style={{ color: "#3f3f46" }}>—</span>;
  return (
    <span style={{ color: pctColor(v), fontWeight: 700 }}>
      {v >= 0 ? "+" : ""}{v.toFixed(2)}%
    </span>
  );
}

export function TokenModal({ address, symbol, onClose, onSnipe }: Props) {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);
  const [view, setView] = useState<"info" | "chart">("info");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dex/token/${address}`)
      .then(r => r.json())
      .then((d: { pairs: Pair[] }) => { setPairs(d.pairs ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [address]);

  const pair = pairs[selected] ?? null;
  const token = pair?.baseToken;
  const price = pair?.priceUsd ? parseFloat(pair.priceUsd) : null;
  const h24 = pair?.priceChange?.h24 ?? null;
  const txns24 = pair?.txns?.h24;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "#000000c0", backdropFilter: "blur(4px)" }} />

      {/* Modal */}
      <div onClick={e => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxWidth: 560, maxHeight: "90dvh", background: "#0c0c0e", border: "1px solid #1e1e21", borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Top accent */}
        <div style={{ height: 2, background: "linear-gradient(90deg,#f97316,#dc2626,#7c3aed)" }} />

        {/* Header */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #18181b", display: "flex", alignItems: "center", gap: 12 }}>
          {pair?.info?.imageUrl && (
            <img src={pair.info.imageUrl} alt={symbol} width={40} height={40}
              style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f4f4f5" }}>${token?.symbol ?? symbol ?? "..."}</div>
            <div style={{ fontSize: 10, color: "#52525b", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {token?.name} · {address.slice(0, 20)}…
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* View toggle */}
            <div style={{ display: "flex", background: "#111113", border: "1px solid #27272a", borderRadius: 8, overflow: "hidden" }}>
              {(["info", "chart"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: "5px 12px", fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer",
                    background: view === v ? "#dc2626" : "transparent",
                    color: view === v ? "#fff" : "#52525b", letterSpacing: ".5px", textTransform: "uppercase" }}>
                  {v}
                </button>
              ))}
            </div>
            <button onClick={onClose}
              style={{ background: "transparent", border: "1px solid #27272a", color: "#52525b", width: 30, height: 30, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <IconX size={14} />
            </button>
          </div>
        </div>

        {/* Chart view */}
        {view === "chart" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <iframe
              src={`https://dexscreener.com/solana/${address}?embed=1&theme=dark&trades=0&info=0`}
              style={{ flex: 1, border: "none", width: "100%", minHeight: 480 }}
              allow="clipboard-write"
              title="DexScreener chart"
            />
            <div style={{ padding: "8px 14px", fontSize: 9, color: "#3f3f46", textAlign: "center", borderTop: "1px solid #18181b" }}>
              Chart powered by DexScreener
            </div>
          </div>
        )}

        {/* Info view: scrollable body + footer */}
        {view === "info" && <>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ padding: "40px 20px", textAlign: "center", fontSize: 11, color: "#52525b" }} className="pulse">
              Loading DEX Screener data…
            </div>
          )}

          {!loading && pairs.length === 0 && (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ color: "#3f3f46", marginBottom: 8, display: "flex", justifyContent: "center" }}><IconSearch size={24} /></div>
              <div style={{ fontSize: 12, color: "#52525b" }}>No pairs found on DEX Screener yet</div>
              <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 4 }}>Token may not have a liquidity pool yet</div>
            </div>
          )}

          {!loading && pair && (
            <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Price hero */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#f4f4f5", letterSpacing: "-1px" }}>
                    {price !== null
                      ? price < 0.000001 ? price.toExponential(4) : price < 0.01 ? `$${price.toFixed(8)}` : `$${price.toFixed(6)}`
                      : "—"}
                  </div>
                  <div style={{ fontSize: 14, marginTop: 2 }}><PctBadge v={h24} /> <span style={{ fontSize: 10, color: "#52525b" }}>24h</span></div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {pair.info?.websites?.[0] && (
                    <a href={pair.info.websites[0].url} target="_blank" rel="noopener noreferrer"
                      style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #27272a", background: "transparent", color: "#71717a", fontSize: 10, fontWeight: 600, textDecoration: "none" }}>
                      Web ↗
                    </a>
                  )}
                  <a href={pair.url} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #f9731640", background: "#f9731610", color: "#f97316", fontSize: 10, fontWeight: 700, textDecoration: "none" }}>
                    DEX ↗
                  </a>
                  <a href={`https://solscan.io/token/${address}`} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "5px 10px", borderRadius: 7, border: "1px solid #3b82f640", background: "#3b82f610", color: "#3b82f6", fontSize: 10, fontWeight: 700, textDecoration: "none" }}>
                    Scan ↗
                  </a>
                </div>
              </div>

              {/* Key stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { l: "Market Cap",  v: fmt(pair.marketCap) },
                  { l: "FDV",         v: fmt(pair.fdv) },
                  { l: "24h Volume",  v: fmt(pair.volume?.h24) },
                  { l: "Liquidity",   v: fmt(pair.liquidity?.usd) },
                ].map(s => (
                  <div key={s.l} style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1px", marginBottom: 3 }}>{s.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#f4f4f5" }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Price change grid */}
              <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 10 }}>PRICE CHANGE</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                  {[["5m", "m5"], ["1h", "h1"], ["6h", "h6"], ["24h", "h24"]].map(([l, k]) => (
                    <div key={k} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 8, color: "#3f3f46", marginBottom: 3 }}>{l}</div>
                      <PctBadge v={pair.priceChange?.[k]} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Txns */}
              {txns24 && (
                <div style={{ background: "#111113", border: "1px solid #1e1e21", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 8 }}>TRANSACTIONS (24H)</div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ flex: 1, background: "#10b98115", border: "1px solid #10b98130", borderRadius: 7, padding: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>{txns24.buys}</div>
                      <div style={{ fontSize: 9, color: "#10b98180" }}>BUYS</div>
                    </div>
                    <div style={{ flex: 1, background: "#ef444415", border: "1px solid #ef444430", borderRadius: 7, padding: "8px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>{txns24.sells}</div>
                      <div style={{ fontSize: 9, color: "#ef444480" }}>SELLS</div>
                    </div>
                    {(txns24.buys + txns24.sells) > 0 && (
                      <div style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: txns24.buys > txns24.sells ? "#10b981" : "#ef4444" }}>
                          {((txns24.buys / (txns24.buys + txns24.sells)) * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: 9, color: "#52525b" }}>BUY RATIO</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pairs selector */}
              {pairs.length > 1 && (
                <div>
                  <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "1.5px", fontWeight: 700, marginBottom: 8 }}>PAIRS ({pairs.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {pairs.slice(0, 5).map((p, i) => (
                      <button key={p.pairAddress} onClick={() => setSelected(i)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                          border: `1px solid ${selected === i ? "#f97316" : "#1e1e21"}`,
                          background: selected === i ? "#f9731610" : "#111113" }}>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: selected === i ? "#f97316" : "#a1a1aa", textTransform: "uppercase" }}>{p.dexId}</span>
                          <span style={{ fontSize: 9, color: "#3f3f46", marginLeft: 6, fontFamily: "monospace" }}>{p.pairAddress.slice(0, 10)}…</span>
                        </div>
                        <span style={{ fontSize: 10, color: "#52525b" }}>{fmt(p.liquidity?.usd)} liq</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer actions */}
        {!loading && pair && onSnipe && (
          <div style={{ padding: "12px 18px", borderTop: "1px solid #18181b", display: "flex", gap: 8 }}>
            <a href={`https://pump.fun/coin/${address}`} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, padding: "9px", borderRadius: 8, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa", fontSize: 11, fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
              Pump.fun ↗
            </a>
            <button onClick={() => { onSnipe(address, token?.symbol ?? symbol ?? ""); onClose(); }}
              style={{ flex: 2, padding: "9px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#dc2626,#7c3aed)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", letterSpacing: ".5px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <IconZap size={12} /> SNIPE THIS TOKEN
            </button>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
