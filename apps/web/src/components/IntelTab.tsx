"use client";

import React, { useState } from "react";
import { useKolWatch, useGems, useCompetitors, useKbSearch } from "@/lib/useFirecrawl";
import { KOLS } from "@/lib/config";
import { pushNotification } from "@/lib/useNotifications";

const MONO = "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace";
const RED  = "#ff2b4e";

function shortCA(ca: string) {
  return `${ca.slice(0, 4)}…${ca.slice(-4)}`;
}

function fmtAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const DEFAULT_HANDLES = KOLS.map(k => k.tw);

interface Props {
  isMobile?: boolean;
}

type Section = "kol" | "gems" | "competitors" | "kb";

export function IntelTab({ isMobile = false }: Props) {
  const [section, setSection] = useState<Section>("kol");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, fontFamily: MONO, background: "#08080d" }}>
      {/* Header */}
      <div style={{ padding: isMobile ? "14px 14px 0" : "20px 24px 0", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 18 : 22, fontWeight: 900, color: "#f4f4f5", letterSpacing: "-0.5px" }}>
            Intel
          </h1>
          <span style={{ fontSize: 9, fontWeight: 700, color: RED, background: `${RED}18`, border: `1px solid ${RED}44`, borderRadius: 4, padding: "2px 6px", letterSpacing: "0.5px" }}>
            FIRECRAWL
          </span>
        </div>

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #18181c", paddingBottom: 0 }}>
          {(["kol", "gems", "competitors", "kb"] as Section[]).map(s => {
            const labels: Record<Section, string> = { kol: "KOL Watch", gems: "Gem Scraper", competitors: "Competitors", kb: "KB Search" };
            const active = section === s;
            return (
              <button key={s} onClick={() => setSection(s)} style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: "8px 12px", fontSize: 10, fontWeight: active ? 800 : 600,
                color: active ? RED : "#52525b",
                borderBottom: active ? `2px solid ${RED}` : "2px solid transparent",
                fontFamily: MONO, letterSpacing: "0.4px", transition: "color .15s",
                marginBottom: -1,
              }}>
                {labels[s].toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "14px" : "20px 24px" }}>
        {section === "kol"         && <KolWatchPanel    isMobile={isMobile} />}
        {section === "gems"        && <GemsPanel        isMobile={isMobile} />}
        {section === "competitors" && <CompetitorsPanel isMobile={isMobile} />}
        {section === "kb"          && <KbPanel          isMobile={isMobile} />}
      </div>
    </div>
  );
}

// ── KOL Watch ─────────────────────────────────────────────────────────────────

function KolWatchPanel({ isMobile }: { isMobile: boolean }) {
  const [handles, setHandles] = useState<string[]>(DEFAULT_HANDLES);
  const [input, setInput]     = useState("");
  const { hits, loading, error, scan } = useKolWatch(handles);

  const addHandle = () => {
    const h = input.trim().replace(/^@/, "");
    if (h && !handles.includes(h)) { setHandles(p => [...p, h]); setInput(""); }
  };

  const runScan = async () => {
    await scan();
    for (const hit of hits) {
      pushNotification({ kind: "kol", severity: "info", title: `@${hit.handle} posted CA`, body: shortCA(hit.ca), tab: "intel" });
    }
  };

  return (
    <div>
      <p style={{ fontSize: 10, color: "#52525b", marginTop: 0, marginBottom: 16 }}>
        Scrapează profilurile X ale KOL-urilor și alertează când apare o adresă Solana nouă.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addHandle()}
          placeholder="@handle"
          style={{ flex: 1, background: "#0e0e12", border: "1px solid #27272a", borderRadius: 6, color: "#f4f4f5", padding: "6px 10px", fontSize: 11, fontFamily: MONO, outline: "none" }} />
        <button onClick={addHandle} style={mkBtn("#27272a", "#a1a1aa")}>+ Add</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
        {handles.map(h => (
          <span key={h} style={{ display: "flex", alignItems: "center", gap: 4, background: "#a855f718", border: "1px solid #a855f744", borderRadius: 5, padding: "3px 8px", fontSize: 9, color: "#a855f7", fontWeight: 700 }}>
            @{h}
            <button onClick={() => setHandles(p => p.filter(x => x !== h))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: 0, fontSize: 11, lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>

      <button onClick={runScan} disabled={loading} style={mkBtn(RED, "#fff", loading)}>
        {loading ? "Scanning…" : "Scan Now"}
      </button>

      {error && <p style={{ fontSize: 10, color: "#ef4444", marginTop: 10 }}>{error}</p>}

      {hits.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 9, color: "#52525b", marginBottom: 8, fontWeight: 700 }}>
            {hits.length} NEW CA{hits.length > 1 ? "s" : ""} DETECTED
          </div>
          {hits.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#0e0e12", border: "1px solid #1e1e24", borderRadius: 7, marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: "#a855f7", fontWeight: 700 }}>@{h.handle}</span>
              <span style={{ flex: 1, fontSize: 10, color: "#f4f4f5", wordBreak: "break-all" }}>{h.ca}</span>
              <button onClick={() => navigator.clipboard.writeText(h.ca)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", fontSize: 9, fontFamily: MONO }}>copy</button>
              <span style={{ fontSize: 9, color: "#3f3f46" }}>{fmtAgo(h.ts)}</span>
            </div>
          ))}
        </div>
      )}

      {!loading && hits.length === 0 && (
        <p style={{ fontSize: 10, color: "#3f3f46", marginTop: 16 }}>
          Niciun CA nou față de ultimul scan. Rulează din nou pentru a verifica.
        </p>
      )}
    </div>
  );
}

// ── Gem Scraper ───────────────────────────────────────────────────────────────

function GemsPanel({ isMobile: _ }: { isMobile: boolean }) {
  const [source, setSource] = useState<"all" | "dexscreener" | "pump">("all");
  const { result, loading, error, fetchGems } = useGems();

  return (
    <div>
      <p style={{ fontSize: 10, color: "#52525b", marginTop: 0, marginBottom: 16 }}>
        Scrapează pump.fun și DexScreener pentru CA-uri Solana noi detectate în listing-uri.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {(["all", "dexscreener", "pump"] as const).map(s => (
          <button key={s} onClick={() => setSource(s)} style={{
            ...mkBtn(source === s ? RED : "#27272a", source === s ? "#fff" : "#71717a"),
            padding: "5px 10px", fontSize: 9,
          }}>
            {s === "all" ? "ALL" : s === "dexscreener" ? "DEXSCREENER" : "PUMP.FUN"}
          </button>
        ))}
        <button onClick={() => fetchGems(source)} disabled={loading}
          style={{ ...mkBtn("#10b981", "#fff", loading), marginLeft: "auto" }}>
          {loading ? "Scraping…" : "Scrape Now"}
        </button>
      </div>

      {error && <p style={{ fontSize: 10, color: "#ef4444" }}>{error}</p>}

      {result && (
        <div>
          <div style={{ fontSize: 9, color: "#52525b", marginBottom: 10, fontWeight: 700 }}>
            {result.total} CA-uri găsite · {new Date(result.fetchedAt).toLocaleTimeString()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {result.cas.slice(0, 50).map((ca, i) => (
              <div key={ca} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", background: "#0e0e12", border: "1px solid #1e1e24", borderRadius: 6 }}>
                <span style={{ fontSize: 9, color: "#3f3f46", width: 22 }}>#{i + 1}</span>
                <span style={{ flex: 1, fontSize: 10, color: "#f4f4f5", wordBreak: "break-all" }}>{ca}</span>
                <button onClick={() => navigator.clipboard.writeText(ca)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", fontSize: 9, fontFamily: MONO }}>copy</button>
              </div>
            ))}
            {result.total > 50 && (
              <p style={{ fontSize: 9, color: "#3f3f46", textAlign: "center" }}>+ {result.total - 50} mai multe</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Competitors ───────────────────────────────────────────────────────────────

function CompetitorsPanel({ isMobile: _ }: { isMobile: boolean }) {
  const { results, loading, error, scan } = useCompetitors();

  return (
    <div>
      <p style={{ fontSize: 10, color: "#52525b", marginTop: 0, marginBottom: 16 }}>
        Scrapează axiom, photon, bullx, gmgn și detectează schimbări față de ultimul snapshot.
      </p>

      <button onClick={scan} disabled={loading} style={mkBtn(RED, "#fff", loading)}>
        {loading ? "Scanning…" : "Scan Competitors"}
      </button>

      {error && <p style={{ fontSize: 10, color: "#ef4444", marginTop: 10 }}>{error}</p>}

      {results.length > 0 && (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map(r => (
            <div key={r.name} style={{ background: "#0e0e12", border: `1px solid ${r.changed ? "#f59e0b44" : "#1e1e24"}`, borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#f4f4f5", textTransform: "uppercase" }}>{r.name}</span>
                {r.changed && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: "#f59e0b", background: "#f59e0b18", border: "1px solid #f59e0b44", borderRadius: 4, padding: "2px 6px" }}>
                    CHANGED
                  </span>
                )}
                <a href={r.url} target="_blank" rel="noreferrer"
                  style={{ marginLeft: "auto", fontSize: 9, color: "#52525b", textDecoration: "none" }}>
                  {r.url.replace("https://", "")}
                </a>
              </div>
              <pre style={{ margin: 0, fontSize: 9, color: "#52525b", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5, fontFamily: MONO }}>
                {r.snippet.slice(0, 300)}{r.snippet.length > 300 ? "…" : ""}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── KB Search ─────────────────────────────────────────────────────────────────

function KbPanel({ isMobile: _ }: { isMobile: boolean }) {
  const [q, setQ] = useState("");
  const { results, loading, error, search } = useKbSearch();

  return (
    <div>
      <p style={{ fontSize: 10, color: "#52525b", marginTop: 0, marginBottom: 16 }}>
        Caută în documentația Solana, Jupiter și resurse web relevante cu Firecrawl.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search(q)}
          placeholder="ex: Jupiter swap API, pump.fun bonding curve…"
          style={{ flex: 1, background: "#0e0e12", border: "1px solid #27272a", borderRadius: 6, color: "#f4f4f5", padding: "6px 10px", fontSize: 11, fontFamily: MONO, outline: "none" }} />
        <button onClick={() => search(q)} disabled={loading || !q.trim()} style={mkBtn(RED, "#fff", loading || !q.trim())}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <p style={{ fontSize: 10, color: "#ef4444" }}>{error}</p>}

      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map((r, i) => (
            <div key={r.url + i} style={{ background: "#0e0e12", border: "1px solid #1e1e24", borderRadius: 8, padding: "12px 14px" }}>
              <a href={r.url} target="_blank" rel="noreferrer"
                style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#06b6d4", marginBottom: 4, wordBreak: "break-all", textDecoration: "none" }}>
                {r.title ?? r.url}
              </a>
              {r.description && (
                <p style={{ margin: "0 0 6px", fontSize: 10, color: "#71717a" }}>{r.description}</p>
              )}
              {r.markdown && (
                <pre style={{ margin: 0, fontSize: 9, color: "#52525b", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.5, maxHeight: 200, overflow: "auto", fontFamily: MONO }}>
                  {r.markdown.slice(0, 600)}{r.markdown.length > 600 ? "\n…" : ""}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function mkBtn(bg: string, color: string, disabled?: boolean): React.CSSProperties {
  const isRed = bg === RED;
  return {
    background:    disabled ? "#1a1a1f" : isRed ? `${RED}18` : bg,
    border:        `1px solid ${disabled ? "#27272a" : bg}`,
    color:         disabled ? "#3f3f46" : isRed ? RED : color,
    padding:       "6px 14px",
    borderRadius:  6,
    fontSize:      10,
    fontWeight:    700,
    fontFamily:    MONO,
    cursor:        disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.5px",
    flexShrink:    0,
  };
}
