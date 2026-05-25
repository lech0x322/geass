"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { IconX, IconSwap, IconRepeat, IconArrowUpRight } from "@/components/icons";
import { signAndSendBytes } from "@/lib/wallet";
import {
  jupQuote,
  jupSwapTx,
  jupLimitOrder,
  jupDca,
  SOL_MINT,
  LAMPORTS,
  type JupQuote,
} from "@/lib/jupiter";

interface Props {
  wallet: string;
  mint: string;
  symbol: string;
  decimals?: number;
  maxTokenAmount?: number;
  mode: "buy" | "sell";
  onClose: () => void;
}

type Tab = "swap" | "limit" | "dca";
type SlippagePreset = "0.5" | "1" | "2" | "custom";

function b64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function formatNumber(n: number, decimals = 6): string {
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(3);
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

// ── Swap Tab ──────────────────────────────────────────────────────────────────

function SwapTab({ wallet, mint, symbol, decimals = 6, maxTokenAmount, mode }: Omit<Props, "onClose">) {
  const [amount, setAmount] = useState("");
  const [slippagePreset, setSlippagePreset] = useState<SlippagePreset>("0.5");
  const [customSlippage, setCustomSlippage] = useState("");
  const [quote, setQuote] = useState<JupQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slippageBps = useCallback((): number => {
    if (slippagePreset === "custom") {
      const v = parseFloat(customSlippage);
      return isNaN(v) ? 50 : Math.round(v * 100);
    }
    return Math.round(parseFloat(slippagePreset) * 100);
  }, [slippagePreset, customSlippage]);

  const fetchQuote = useCallback(async (val: string) => {
    const parsed = parseFloat(val);
    if (!val || isNaN(parsed) || parsed <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const inputMint = mode === "buy" ? SOL_MINT : mint;
      const outputMint = mode === "buy" ? mint : SOL_MINT;
      const amountLamports = mode === "buy"
        ? Math.round(parsed * LAMPORTS)
        : Math.round(parsed * Math.pow(10, decimals));
      const q = await jupQuote(inputMint, outputMint, amountLamports, slippageBps());
      setQuote(q);
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : "Quote failed");
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, [mint, mode, decimals, slippageBps]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuote(amount), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [amount, fetchQuote]);

  const handleSwap = async () => {
    if (!quote) return;
    setTxLoading(true);
    setTxError(null);
    setTxSig(null);
    try {
      const { swapTransaction } = await jupSwapTx(quote, wallet);
      const bytes = b64ToUint8Array(swapTransaction);
      const sig = await signAndSendBytes(bytes);
      setTxSig(sig);
    } catch (e) {
      setTxError(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setTxLoading(false);
    }
  };

  const outAmount = quote
    ? mode === "buy"
      ? parseFloat(quote.outAmount) / Math.pow(10, decimals)
      : parseFloat(quote.outAmount) / LAMPORTS
    : null;

  const minReceived = quote
    ? mode === "buy"
      ? parseFloat(quote.otherAmountThreshold) / Math.pow(10, decimals)
      : parseFloat(quote.otherAmountThreshold) / LAMPORTS
    : null;

  const priceImpact = quote ? parseFloat(quote.priceImpactPct) : null;
  const highImpact = priceImpact !== null && priceImpact > 2;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Amount input */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <label style={{ fontSize: 12, color: "#52525b" }}>
            {mode === "buy" ? "SOL to spend" : `${symbol} to sell`}
          </label>
          {mode === "sell" && maxTokenAmount !== undefined && (
            <button
              onClick={() => setAmount(String(maxTokenAmount))}
              style={{ fontSize: 11, color: "#a855f7", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              MAX
            </button>
          )}
        </div>
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          style={{
            width: "100%",
            background: "#16161a",
            border: "1px solid #1e1e21",
            borderRadius: 8,
            padding: "10px 12px",
            color: "#f4f4f5",
            fontSize: 16,
            boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {/* Slippage */}
      <div>
        <label style={{ fontSize: 12, color: "#52525b", display: "block", marginBottom: 6 }}>Slippage tolerance</label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {(["0.5", "1", "2"] as SlippagePreset[]).map(s => (
            <button
              key={s}
              onClick={() => setSlippagePreset(s)}
              style={{
                padding: "5px 12px",
                borderRadius: 6,
                border: "1px solid",
                borderColor: slippagePreset === s ? "#a855f7" : "#1e1e21",
                background: slippagePreset === s ? "rgba(168,85,247,0.12)" : "#16161a",
                color: slippagePreset === s ? "#a855f7" : "#52525b",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {s}%
            </button>
          ))}
          <button
            onClick={() => setSlippagePreset("custom")}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid",
              borderColor: slippagePreset === "custom" ? "#a855f7" : "#1e1e21",
              background: slippagePreset === "custom" ? "rgba(168,85,247,0.12)" : "#16161a",
              color: slippagePreset === "custom" ? "#a855f7" : "#52525b",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Custom
          </button>
          {slippagePreset === "custom" && (
            <input
              type="number"
              min="0"
              step="0.1"
              value={customSlippage}
              onChange={e => setCustomSlippage(e.target.value)}
              placeholder="%"
              style={{
                width: 60,
                background: "#16161a",
                border: "1px solid #1e1e21",
                borderRadius: 6,
                padding: "5px 8px",
                color: "#f4f4f5",
                fontSize: 12,
                outline: "none",
              }}
            />
          )}
        </div>
      </div>

      {/* Quote output */}
      {(quoteLoading || quote || quoteError) && (
        <div style={{ background: "#16161a", border: "1px solid #1e1e21", borderRadius: 8, padding: "10px 12px" }}>
          {quoteLoading && <p style={{ color: "#52525b", fontSize: 13, margin: 0 }}>Fetching quote…</p>}
          {quoteError && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{quoteError}</p>}
          {quote && !quoteLoading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#52525b" }}>Expected output</span>
                <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>
                  {outAmount !== null ? formatNumber(outAmount) : "—"} {mode === "buy" ? symbol : "SOL"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#52525b" }}>Minimum received</span>
                <span style={{ fontSize: 12, color: "#f4f4f5" }}>
                  {minReceived !== null ? formatNumber(minReceived) : "—"} {mode === "buy" ? symbol : "SOL"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#52525b" }}>Price impact</span>
                <span style={{ fontSize: 12, color: highImpact ? "#ef4444" : "#f4f4f5", fontWeight: highImpact ? 700 : 400 }}>
                  {priceImpact !== null ? `${priceImpact.toFixed(3)}%` : "—"}
                  {highImpact && " ⚠"}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Swap button */}
      <button
        onClick={handleSwap}
        disabled={!quote || txLoading || !!txSig}
        style={{
          width: "100%",
          padding: "12px 0",
          borderRadius: 10,
          border: "none",
          background: !quote || txLoading || !!txSig ? "#1e1e21" : "linear-gradient(135deg, #a855f7, #7c3aed)",
          color: !quote || txLoading || !!txSig ? "#52525b" : "#fff",
          fontSize: 15,
          fontWeight: 600,
          cursor: !quote || txLoading || !!txSig ? "not-allowed" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {txLoading ? "Signing…" : txSig ? "Swapped!" : `Swap ${mode === "buy" ? "SOL → " + symbol : symbol + " → SOL"}`}
      </button>

      {/* Result */}
      {txSig && (
        <a
          href={`https://solscan.io/tx/${txSig}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: 12, textDecoration: "none" }}
        >
          View on Solscan <IconArrowUpRight size={12} />
        </a>
      )}
      {txError && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{txError}</p>}
    </div>
  );
}

// ── Limit Order Tab ───────────────────────────────────────────────────────────

type ExpiryOption = "none" | "1h" | "24h" | "7d";

function LimitTab({ wallet, mint, symbol, decimals = 6, mode }: Omit<Props, "onClose">) {
  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");
  const [expiry, setExpiry] = useState<ExpiryOption>("none");
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const expirySeconds: Record<ExpiryOption, number | null> = {
    none: null,
    "1h": 3600,
    "24h": 86400,
    "7d": 604800,
  };

  const impliedPrice = (() => {
    const i = parseFloat(inputAmount);
    const o = parseFloat(outputAmount);
    if (!i || !o || isNaN(i) || isNaN(o)) return null;
    return mode === "buy" ? i / o : o / i; // SOL per token
  })();

  const handlePlace = async () => {
    const inAmt = parseFloat(inputAmount);
    const outAmt = parseFloat(outputAmount);
    if (!inAmt || !outAmt || isNaN(inAmt) || isNaN(outAmt)) {
      setError("Enter valid amounts");
      return;
    }
    setLoading(true);
    setError(null);
    setTxSig(null);
    try {
      const inputMint = mode === "buy" ? SOL_MINT : mint;
      const outputMint = mode === "buy" ? mint : SOL_MINT;
      const makingAmountRaw = mode === "buy"
        ? Math.round(inAmt * LAMPORTS)
        : Math.round(inAmt * Math.pow(10, decimals));
      const takingAmountRaw = mode === "buy"
        ? Math.round(outAmt * Math.pow(10, decimals))
        : Math.round(outAmt * LAMPORTS);

      const expirySecs = expirySeconds[expiry];
      const expiredAt = expirySecs
        ? String(Math.floor(Date.now() / 1000) + expirySecs)
        : undefined;

      const { tx } = await jupLimitOrder({
        inputMint,
        outputMint,
        maker: wallet,
        payer: wallet,
        makingAmount: String(makingAmountRaw),
        takingAmount: String(takingAmountRaw),
        ...(expiredAt ? { expiredAt } : {}),
      });

      const bytes = b64ToUint8Array(tx);
      const sig = await signAndSendBytes(bytes);
      setTxSig(sig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Limit order failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={{ fontSize: 12, color: "#52525b", display: "block", marginBottom: 6 }}>
          {mode === "buy" ? "SOL to spend" : `${symbol} to sell`}
        </label>
        <input
          type="number" min="0" step="any" value={inputAmount}
          onChange={e => setInputAmount(e.target.value)}
          placeholder="0.00"
          style={{ width: "100%", background: "#16161a", border: "1px solid #1e1e21", borderRadius: 8, padding: "10px 12px", color: "#f4f4f5", fontSize: 15, boxSizing: "border-box", outline: "none" }}
        />
      </div>
      <div>
        <label style={{ fontSize: 12, color: "#52525b", display: "block", marginBottom: 6 }}>
          {mode === "buy" ? `Minimum ${symbol} to receive` : "Minimum SOL to receive"}
        </label>
        <input
          type="number" min="0" step="any" value={outputAmount}
          onChange={e => setOutputAmount(e.target.value)}
          placeholder="0.00"
          style={{ width: "100%", background: "#16161a", border: "1px solid #1e1e21", borderRadius: 8, padding: "10px 12px", color: "#f4f4f5", fontSize: 15, boxSizing: "border-box", outline: "none" }}
        />
      </div>

      {impliedPrice !== null && (
        <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>
          Implied price: <span style={{ color: "#eab308" }}>{formatNumber(impliedPrice, 8)} SOL / token</span>
        </p>
      )}

      <div>
        <label style={{ fontSize: 12, color: "#52525b", display: "block", marginBottom: 6 }}>Expiry</label>
        <div style={{ display: "flex", gap: 6 }}>
          {(["none", "1h", "24h", "7d"] as ExpiryOption[]).map(opt => (
            <button
              key={opt}
              onClick={() => setExpiry(opt)}
              style={{
                flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid",
                borderColor: expiry === opt ? "#eab308" : "#1e1e21",
                background: expiry === opt ? "rgba(234,179,8,0.1)" : "#16161a",
                color: expiry === opt ? "#eab308" : "#52525b",
                fontSize: 11, cursor: "pointer",
              }}
            >
              {opt === "none" ? "None" : opt}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handlePlace}
        disabled={loading || !!txSig}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
          background: loading || !!txSig ? "#1e1e21" : "linear-gradient(135deg, #eab308, #ca8a04)",
          color: loading || !!txSig ? "#52525b" : "#000",
          fontSize: 15, fontWeight: 700, cursor: loading || !!txSig ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Placing…" : txSig ? "Order placed!" : "Place Limit Order"}
      </button>

      {txSig && (
        <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: 12, textDecoration: "none" }}>
          View on Solscan <IconArrowUpRight size={12} />
        </a>
      )}
      {error && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{error}</p>}
    </div>
  );
}

// ── DCA Tab ───────────────────────────────────────────────────────────────────

type DcaInterval = "1h" | "6h" | "24h" | "7d";

const DCA_INTERVAL_SECONDS: Record<DcaInterval, number> = {
  "1h": 3600,
  "6h": 21600,
  "24h": 86400,
  "7d": 604800,
};

function DcaTab({ wallet, mint, symbol, decimals = 6 }: Omit<Props, "onClose">) {
  const [totalSol, setTotalSol] = useState("");
  const [perCycleSol, setPerCycleSol] = useState("");
  const [interval, setInterval] = useState<DcaInterval>("24h");
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cycles = (() => {
    const t = parseFloat(totalSol);
    const c = parseFloat(perCycleSol);
    if (!t || !c || isNaN(t) || isNaN(c) || c <= 0) return null;
    return Math.floor(t / c);
  })();

  const handleStart = async () => {
    const total = parseFloat(totalSol);
    const perCycle = parseFloat(perCycleSol);
    if (!total || !perCycle || isNaN(total) || isNaN(perCycle) || perCycle <= 0) {
      setError("Enter valid SOL amounts");
      return;
    }
    if (cycles !== null && cycles < 2) {
      setError("Need at least 2 cycles");
      return;
    }
    setLoading(true);
    setError(null);
    setTxSig(null);
    try {
      const inAmountRaw = String(Math.round(total * LAMPORTS));
      const inAmountPerCycleRaw = String(Math.round(perCycle * LAMPORTS));
      const { tx } = await jupDca({
        payer: wallet,
        user: wallet,
        inputMint: SOL_MINT,
        outputMint: mint,
        inAmount: inAmountRaw,
        inAmountPerCycle: inAmountPerCycleRaw,
        cycleSecondsApart: DCA_INTERVAL_SECONDS[interval],
      });
      const bytes = b64ToUint8Array(tx);
      const sig = await signAndSendBytes(bytes);
      setTxSig(sig);
    } catch (e) {
      setError(e instanceof Error ? e.message : "DCA creation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>
        Automatically buy <span style={{ color: "#a855f7" }}>{symbol}</span> with SOL on a recurring schedule.
      </p>

      <div>
        <label style={{ fontSize: 12, color: "#52525b", display: "block", marginBottom: 6 }}>Total SOL to spend</label>
        <input
          type="number" min="0" step="any" value={totalSol}
          onChange={e => setTotalSol(e.target.value)}
          placeholder="0.00"
          style={{ width: "100%", background: "#16161a", border: "1px solid #1e1e21", borderRadius: 8, padding: "10px 12px", color: "#f4f4f5", fontSize: 15, boxSizing: "border-box", outline: "none" }}
        />
      </div>

      <div>
        <label style={{ fontSize: 12, color: "#52525b", display: "block", marginBottom: 6 }}>SOL per cycle</label>
        <input
          type="number" min="0" step="any" value={perCycleSol}
          onChange={e => setPerCycleSol(e.target.value)}
          placeholder="0.00"
          style={{ width: "100%", background: "#16161a", border: "1px solid #1e1e21", borderRadius: 8, padding: "10px 12px", color: "#f4f4f5", fontSize: 15, boxSizing: "border-box", outline: "none" }}
        />
      </div>

      {cycles !== null && (
        <p style={{ fontSize: 12, color: "#52525b", margin: 0 }}>
          Cycles: <span style={{ color: "#10b981" }}>{cycles}</span>
          {" — "}duration: <span style={{ color: "#10b981" }}>
            {(() => {
              const secs = cycles * DCA_INTERVAL_SECONDS[interval];
              if (secs < 3600) return `${Math.round(secs / 60)}m`;
              if (secs < 86400) return `${(secs / 3600).toFixed(1)}h`;
              return `${(secs / 86400).toFixed(1)}d`;
            })()}
          </span>
        </p>
      )}

      <div>
        <label style={{ fontSize: 12, color: "#52525b", display: "block", marginBottom: 6 }}>Interval</label>
        <div style={{ display: "flex", gap: 6 }}>
          {(["1h", "6h", "24h", "7d"] as DcaInterval[]).map(opt => (
            <button
              key={opt}
              onClick={() => setInterval(opt)}
              style={{
                flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid",
                borderColor: interval === opt ? "#a855f7" : "#1e1e21",
                background: interval === opt ? "rgba(168,85,247,0.12)" : "#16161a",
                color: interval === opt ? "#a855f7" : "#52525b",
                fontSize: 11, cursor: "pointer",
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleStart}
        disabled={loading || !!txSig}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
          background: loading || !!txSig ? "#1e1e21" : "linear-gradient(135deg, #a855f7, #7c3aed)",
          color: loading || !!txSig ? "#52525b" : "#fff",
          fontSize: 15, fontWeight: 700, cursor: loading || !!txSig ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Starting…" : txSig ? "DCA started!" : "Start DCA"}
      </button>

      {txSig && (
        <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 4, color: "#10b981", fontSize: 12, textDecoration: "none" }}>
          View on Solscan <IconArrowUpRight size={12} />
        </a>
      )}
      {error && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{error}</p>}
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────

export default function JupiterSwapModal(props: Props) {
  const { wallet, mint, symbol, decimals = 6, maxTokenAmount, mode, onClose } = props;
  const [tab, setTab] = useState<Tab>("swap");

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "swap", label: "Swap", icon: <IconSwap size={14} /> },
    { id: "limit", label: "Limit", icon: <IconArrowUpRight size={14} /> },
    { id: "dca", label: "DCA", icon: <IconRepeat size={14} /> },
  ];

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.8)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%", maxWidth: 440,
          background: "#0c0c0e",
          border: "1px solid #1e1e21",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px 0",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#f4f4f5" }}>
              {mode === "buy" ? "Buy" : "Sell"} {symbol}
            </h2>
            <p style={{ margin: 0, fontSize: 11, color: "#52525b", marginTop: 2 }}>
              {wallet.slice(0, 4)}…{wallet.slice(-4)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#52525b", cursor: "pointer", padding: 4 }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "14px 18px 0" }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "8px 0",
                borderRadius: 8,
                border: "1px solid",
                borderColor: tab === t.id ? "#a855f7" : "#1e1e21",
                background: tab === t.id ? "rgba(168,85,247,0.12)" : "transparent",
                color: tab === t.id ? "#a855f7" : "#52525b",
                fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "16px 18px 18px" }}>
          {tab === "swap" && (
            <SwapTab
              wallet={wallet} mint={mint} symbol={symbol}
              decimals={decimals} maxTokenAmount={maxTokenAmount} mode={mode}
            />
          )}
          {tab === "limit" && (
            <LimitTab
              wallet={wallet} mint={mint} symbol={symbol}
              decimals={decimals} maxTokenAmount={maxTokenAmount} mode={mode}
            />
          )}
          {tab === "dca" && (
            <DcaTab
              wallet={wallet} mint={mint} symbol={symbol}
              decimals={decimals} maxTokenAmount={maxTokenAmount} mode={mode}
            />
          )}
        </div>
      </div>
    </div>
  );
}
