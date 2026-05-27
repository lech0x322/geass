"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  fetchAllMarkets, fetchUserPosition, marketPda, positionPda,
  buildCreateMarket, buildPlaceBet, buildResolveMarket, buildClaimWinnings,
  sendWithPhantom,
  type MarketAccount, type PositionAccount,
} from "@/lib/predictions";

// ── helpers ────────────────────────────────────────────────────────────────
function pct(a: number, b: number) {
  const tot = a + b;
  if (!tot) return [50, 50];
  return [Math.round((a / tot) * 100), Math.round((b / tot) * 100)];
}
function fmtSOL(n: number) { return n.toFixed(3) + " SOL"; }
function fmtCountdown(ts: number) {
  const diff = ts - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600), m = Math.floor((diff % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}
function outcomeColor(w: number) {
  if (w === 0) return "#22c55e";
  if (w === 1) return "#3b82f6";
  if (w === 2) return "#eab308";
  return "#52525b";
}

// ── sub-components ─────────────────────────────────────────────────────────
interface MarketCardProps {
  m: MarketAccount;
  pos: PositionAccount | null;
  wallet: string;
  onSelect: (m: MarketAccount) => void;
}
function MarketCard({ m, pos, wallet, onSelect }: MarketCardProps) {
  const [pA, pB] = pct(m.totalA, m.totalB);
  const expired = Math.floor(Date.now() / 1000) >= m.resolutionTs;
  const isCreator = m.creator === wallet;
  const resolved = m.resolved;
  return (
    <div onClick={() => onSelect(m)} style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: "16px 18px", cursor: "pointer", transition: "border-color .15s" }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#ef444466")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#27272a")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#fafafa", lineHeight: 1.4, flex: 1, paddingRight: 12 }}>{m.question}</div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {resolved
            ? <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: outcomeColor(m.winningOutcome) + "22", color: outcomeColor(m.winningOutcome), fontWeight: 700 }}>
                {m.winningOutcome === 2 ? "VOID" : `${m.winningOutcome === 0 ? m.outcomeA : m.outcomeB} WON`}
              </span>
            : expired
              ? <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#3f3f4622", color: "#71717a", fontWeight: 700 }}>AWAITING RESOLVE</span>
              : <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#22c55e22", color: "#22c55e", fontWeight: 700 }}>LIVE · {fmtCountdown(m.resolutionTs)}</span>
          }
          {isCreator && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#a855f722", color: "#a855f7", fontWeight: 700 }}>CREATOR</span>}
        </div>
      </div>
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 8, marginBottom: 8 }}>
        <div style={{ width: `${pA}%`, background: "#22c55e", transition: "width .4s" }} />
        <div style={{ width: `${pB}%`, background: "#3b82f6", transition: "width .4s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#71717a" }}>
        <span style={{ color: "#22c55e", fontWeight: 600 }}>{m.outcomeA} {pA}%</span>
        <span style={{ color: "#a1a1aa" }}>Pool: {fmtSOL(m.totalA + m.totalB)}</span>
        <span style={{ color: "#3b82f6", fontWeight: 600 }}>{pB}% {m.outcomeB}</span>
      </div>
      {pos && (
        <div style={{ marginTop: 8, fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "#18181b", color: "#a1a1aa" }}>
          Your bet: <b style={{ color: pos.outcome === 0 ? "#22c55e" : "#3b82f6" }}>{fmtSOL(pos.amount)} on {pos.outcome === 0 ? m.outcomeA : m.outcomeB}</b>
          {pos.claimed && <span style={{ marginLeft: 8, color: "#eab308" }}>✓ Claimed</span>}
        </div>
      )}
    </div>
  );
}

// ── main tab ───────────────────────────────────────────────────────────────
interface Props { wallet: string; isMobile: boolean; }

type View = "list" | "create" | "detail";

export function PredictionsTab({ wallet, isMobile }: Props) {
  const [view, setView]           = useState<View>("list");
  const [markets, setMarkets]     = useState<MarketAccount[]>([]);
  const [positions, setPositions] = useState<Record<string, PositionAccount | null>>({});
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<MarketAccount | null>(null);
  const [txMsg, setTxMsg]         = useState("");
  const [txLoading, setTxLoading] = useState(false);
  const [filter, setFilter]       = useState<"all" | "live" | "mine" | "resolved">("all");

  // create form
  const [cQuestion, setCQuestion] = useState("");
  const [cOutcomeA, setCOutcomeA] = useState("Yes");
  const [cOutcomeB, setCOutcomeB] = useState("No");
  const [cDate, setCDate]         = useState("");

  // bet form
  const [betSide, setBetSide]     = useState<0 | 1>(0);
  const [betAmt, setBetAmt]       = useState("0.1");

  const load = useCallback(async () => {
    setLoading(true);
    const ms = await fetchAllMarkets();
    setMarkets(ms);
    setLoading(false);
    if (!wallet) return;
    const walletPk = new PublicKey(wallet);
    const entries = await Promise.all(
      ms.map(async m => {
        const pos = await fetchUserPosition(new PublicKey(m.address), walletPk);
        return [m.address, pos] as [string, PositionAccount | null];
      })
    );
    setPositions(Object.fromEntries(entries));
  }, [wallet]);

  useEffect(() => { load(); }, [load]);

  const filtered = markets.filter(m => {
    const now = Math.floor(Date.now() / 1000);
    if (filter === "live")     return !m.resolved && now < m.resolutionTs;
    if (filter === "resolved") return m.resolved;
    if (filter === "mine")     return positions[m.address] !== null && positions[m.address] !== undefined;
    return true;
  });

  async function handleCreate() {
    if (!cQuestion.trim() || !cOutcomeA.trim() || !cOutcomeB.trim() || !cDate) {
      setTxMsg("Fill all fields."); return;
    }
    const resTs = BigInt(Math.floor(new Date(cDate).getTime() / 1000));
    const now   = BigInt(Math.floor(Date.now() / 1000));
    if (resTs <= now) { setTxMsg("Resolution date must be in the future."); return; }
    const marketId = BigInt(Date.now());
    const [mPda] = marketPda(new PublicKey(wallet), marketId);
    setTxLoading(true); setTxMsg("");
    try {
      const ix = buildCreateMarket(new PublicKey(wallet), mPda, marketId, cQuestion.trim(), cOutcomeA.trim(), cOutcomeB.trim(), resTs);
      const sig = await sendWithPhantom(ix, wallet);
      setTxMsg("✅ Market created! tx: " + sig.slice(0, 20) + "…");
      setCQuestion(""); setCOutcomeA("Yes"); setCOutcomeB("No"); setCDate("");
      setTimeout(() => { setView("list"); load(); }, 1500);
    } catch (e: unknown) {
      setTxMsg("❌ " + (e instanceof Error ? e.message : String(e)));
    } finally { setTxLoading(false); }
  }

  async function handleBet() {
    if (!selected) return;
    const amt = parseFloat(betAmt);
    if (!amt || amt < 0.001) { setTxMsg("Min bet: 0.001 SOL"); return; }
    const amtLamports = BigInt(Math.round(amt * 1_000_000_000));
    const mPk = new PublicKey(selected.address);
    const uPk = new PublicKey(wallet);
    const [posPda] = positionPda(mPk, uPk);
    setTxLoading(true); setTxMsg("");
    try {
      const ix = buildPlaceBet(uPk, mPk, posPda, betSide, amtLamports);
      const sig = await sendWithPhantom(ix, wallet);
      setTxMsg("✅ Bet placed! tx: " + sig.slice(0, 20) + "…");
      setTimeout(load, 2000);
    } catch (e: unknown) {
      setTxMsg("❌ " + (e instanceof Error ? e.message : String(e)));
    } finally { setTxLoading(false); }
  }

  async function handleResolve(outcome: 0 | 1 | 2) {
    if (!selected) return;
    const mPk = new PublicKey(selected.address);
    setTxLoading(true); setTxMsg("");
    try {
      const ix = buildResolveMarket(new PublicKey(wallet), mPk, outcome);
      const sig = await sendWithPhantom(ix, wallet);
      setTxMsg("✅ Resolved! tx: " + sig.slice(0, 20) + "…");
      setTimeout(load, 2000);
    } catch (e: unknown) {
      setTxMsg("❌ " + (e instanceof Error ? e.message : String(e)));
    } finally { setTxLoading(false); }
  }

  async function handleClaim() {
    if (!selected) return;
    const mPk = new PublicKey(selected.address);
    const uPk = new PublicKey(wallet);
    const [posPda] = positionPda(mPk, uPk);
    setTxLoading(true); setTxMsg("");
    try {
      const ix = buildClaimWinnings(uPk, mPk, posPda);
      const sig = await sendWithPhantom(ix, wallet);
      setTxMsg("✅ Claimed! tx: " + sig.slice(0, 20) + "…");
      setTimeout(load, 2000);
    } catch (e: unknown) {
      setTxMsg("❌ " + (e instanceof Error ? e.message : String(e)));
    } finally { setTxLoading(false); }
  }

  const inp: React.CSSProperties = { width: "100%", background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: "9px 12px", color: "#fafafa", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const btn = (col: string, full = false): React.CSSProperties => ({
    background: col, border: "none", borderRadius: 8, padding: "9px 18px", color: "#fff",
    fontWeight: 700, fontSize: 13, cursor: txLoading ? "not-allowed" : "pointer",
    opacity: txLoading ? .5 : 1, width: full ? "100%" : undefined,
  });

  // ── detail view ────────────────────────────────────────────────────────
  if (view === "detail" && selected) {
    const m = selected;
    const pos = positions[m.address] ?? null;
    const [pA, pB] = pct(m.totalA, m.totalB);
    const now = Math.floor(Date.now() / 1000);
    const expired = now >= m.resolutionTs;
    const isCreator = m.creator === wallet;
    const canBet = !m.resolved && !expired && (!pos || pos.amount === 0);
    const canResolve = isCreator && !m.resolved && expired;
    const canClaim = m.resolved && pos && !pos.claimed && (pos.outcome === m.winningOutcome || m.winningOutcome === 2);

    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 0" }}>
        <button onClick={() => { setView("list"); setSelected(null); setTxMsg(""); }}
          style={{ background: "none", border: "none", color: "#71717a", fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
          ← Back to markets
        </button>

        <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 14, padding: "20px 22px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#fafafa", marginBottom: 14 }}>{m.question}</div>

          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 12, marginBottom: 10 }}>
            <div style={{ width: `${pA}%`, background: "#22c55e", transition: "width .4s" }} />
            <div style={{ width: `${pB}%`, background: "#3b82f6", transition: "width .4s" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 18 }}>
            <span style={{ color: "#22c55e", fontWeight: 700 }}>{m.outcomeA}: {pA}% · {fmtSOL(m.totalA)}</span>
            <span style={{ color: "#3b82f6", fontWeight: 700 }}>{pB}% · {fmtSOL(m.totalB)} : {m.outcomeB}</span>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, fontSize: 11 }}>
            <span style={{ padding: "4px 10px", borderRadius: 20, background: "#18181b", color: "#71717a" }}>
              Pool: {fmtSOL(m.totalA + m.totalB)}
            </span>
            <span style={{ padding: "4px 10px", borderRadius: 20, background: "#18181b", color: "#71717a" }}>
              Resolves: {new Date(m.resolutionTs * 1000).toLocaleString()}
            </span>
            {m.resolved && (
              <span style={{ padding: "4px 10px", borderRadius: 20, background: outcomeColor(m.winningOutcome) + "22", color: outcomeColor(m.winningOutcome), fontWeight: 700 }}>
                {m.winningOutcome === 2 ? "VOID" : (m.winningOutcome === 0 ? m.outcomeA : m.outcomeB) + " WON"}
              </span>
            )}
          </div>

          {pos && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "#18181b", marginBottom: 18, fontSize: 12, color: "#a1a1aa" }}>
              Your position: <b style={{ color: pos.outcome === 0 ? "#22c55e" : "#3b82f6" }}>{fmtSOL(pos.amount)} on {pos.outcome === 0 ? m.outcomeA : m.outcomeB}</b>
              {pos.claimed && <span style={{ marginLeft: 8, color: "#eab308" }}>✓ Claimed</span>}
            </div>
          )}

          {canBet && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: "#71717a", marginBottom: 8, fontWeight: 600 }}>Place Bet</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button onClick={() => setBetSide(0)} style={{ ...btn(betSide === 0 ? "#22c55e" : "#27272a"), flex: 1 }} disabled={txLoading}>{m.outcomeA}</button>
                <button onClick={() => setBetSide(1)} style={{ ...btn(betSide === 1 ? "#3b82f6" : "#27272a"), flex: 1 }} disabled={txLoading}>{m.outcomeB}</button>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" value={betAmt} onChange={e => setBetAmt(e.target.value)} min="0.001" step="0.01"
                  style={{ ...inp, flex: 1 }} placeholder="SOL amount" />
                <button onClick={handleBet} style={btn("#ef4444")} disabled={txLoading}>
                  {txLoading ? "Sending…" : "Bet"}
                </button>
              </div>
            </div>
          )}

          {canResolve && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, color: "#71717a", marginBottom: 8, fontWeight: 600 }}>Resolve Market</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleResolve(0)} style={btn("#22c55e")} disabled={txLoading}>{m.outcomeA} Won</button>
                <button onClick={() => handleResolve(1)} style={btn("#3b82f6")} disabled={txLoading}>{m.outcomeB} Won</button>
                <button onClick={() => handleResolve(2)} style={btn("#eab308")} disabled={txLoading}>Void</button>
              </div>
            </div>
          )}

          {canClaim && (
            <button onClick={handleClaim} style={btn("#a855f7", true)} disabled={txLoading}>
              {txLoading ? "Claiming…" : "Claim Winnings"}
            </button>
          )}

          {txMsg && (
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 8, background: "#18181b", fontSize: 12, color: txMsg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>
              {txMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── create view ────────────────────────────────────────────────────────
  if (view === "create") {
    return (
      <div style={{ maxWidth: 540, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 0" }}>
        <button onClick={() => { setView("list"); setTxMsg(""); }}
          style={{ background: "none", border: "none", color: "#71717a", fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
          ← Back
        </button>
        <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 14, padding: "22px 22px" }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#fafafa", marginBottom: 20 }}>Create Prediction Market</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6, fontWeight: 600 }}>QUESTION</div>
              <textarea value={cQuestion} onChange={e => setCQuestion(e.target.value)} maxLength={200}
                style={{ ...inp, minHeight: 72, resize: "vertical" }} placeholder="Will SOL reach $300 by end of June?" />
              <div style={{ fontSize: 10, color: "#3f3f46", textAlign: "right" }}>{cQuestion.length}/200</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 6, fontWeight: 600 }}>OUTCOME A</div>
                <input value={cOutcomeA} onChange={e => setCOutcomeA(e.target.value)} maxLength={60} style={inp} placeholder="Yes" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#3b82f6", marginBottom: 6, fontWeight: 600 }}>OUTCOME B</div>
                <input value={cOutcomeB} onChange={e => setCOutcomeB(e.target.value)} maxLength={60} style={inp} placeholder="No" />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6, fontWeight: 600 }}>RESOLUTION DATE &amp; TIME</div>
              <input type="datetime-local" value={cDate} onChange={e => setCDate(e.target.value)} style={inp} />
            </div>
            <button onClick={handleCreate} style={btn("#ef4444", true)} disabled={txLoading}>
              {txLoading ? "Creating…" : "Create Market (on-chain)"}
            </button>
            {txMsg && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "#18181b", fontSize: 12, color: txMsg.startsWith("✅") ? "#22c55e" : "#ef4444" }}>
                {txMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── list view ──────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 0" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#fafafa" }}>Prediction Markets</div>
          <div style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>On-chain · Powered by Solana</div>
        </div>
        <button onClick={() => setView("create")} style={btn("#ef4444")}>+ Create</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {(["all", "live", "mine", "resolved"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "5px 14px", borderRadius: 20, border: "1px solid " + (filter === f ? "#ef4444" : "#27272a"),
              background: filter === f ? "#ef444422" : "transparent", color: filter === f ? "#ef4444" : "#52525b",
              fontSize: 12, fontWeight: filter === f ? 700 : 500, cursor: "pointer", textTransform: "capitalize" }}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "#52525b", padding: "60px 0", fontSize: 13 }}>Loading markets…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ color: "#52525b", fontSize: 13, marginBottom: 16 }}>
            {filter === "mine" ? "You haven't placed any bets yet." : "No markets found. Be the first to create one!"}
          </div>
          {filter !== "mine" && <button onClick={() => setView("create")} style={btn("#ef4444")}>Create Market</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(m => (
            <MarketCard key={m.address} m={m} pos={positions[m.address] ?? null} wallet={wallet}
              onSelect={m2 => { setSelected(m2); setTxMsg(""); setView("detail"); }} />
          ))}
        </div>
      )}
    </div>
  );
}
