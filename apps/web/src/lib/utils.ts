export const wait    = (ms: number) => new Promise(r => setTimeout(r, ms));
export const fmtMcap = (n: number) => n>=1e6?`$${(n/1e6).toFixed(1)}M`:n>=1e3?`$${(n/1e3).toFixed(0)}k`:`$${n}`;
export const fmtAge  = (s: number) => s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`;
export const fmtTok  = (n: number) => !n?'0':n>=1e9?`${(n/1e9).toFixed(1)}b`:n>=1e6?`${(n/1e6).toFixed(1)}m`:n>=1e3?`${(n/1e3).toFixed(1)}k`:Number(n).toFixed(1);
export const scoreClr = (s: number) => s>=70?"#10b981":s>=50?"#eab308":"#ef4444";
