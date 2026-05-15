"use client";
import { scoreClr } from "@/lib/utils";

export function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r, dash = (score / 100) * circ, c = scoreClr(score);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272a" strokeWidth={4}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray .6s" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize: size > 42 ? 13 : 10, fontWeight: 800, color: c }}>{score}</div>
    </div>
  );
}
